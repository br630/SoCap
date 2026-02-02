import OpenAI from 'openai';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { ContactService } from './contactService';

// Types
interface MessageSuggestions {
  casual: string;
  warm: string;
  thoughtful: string;
}

interface EventIdea {
  name: string;
  description: string;
  estimatedCost: number;
  duration: string;
  venueType: string;
  tips: string[];
}

interface ConversationStarter {
  topic: string;
  opener: string;
  followUp: string;
}

interface RelationshipTip {
  title: string;
  advice: string;
  actionItem: string;
  source?: string;
}

type MessageContext = 
  | 'birthday' 
  | 'check-in' 
  | 'event-invite' 
  | 'holiday' 
  | 'congratulations' 
  | 'sympathy' 
  | 'thank-you'
  | 'reconnect'
  | 'general';

type BudgetTier = 'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM';

interface EventIdeaParams {
  budgetTier: BudgetTier;
  groupSize: number;
  location?: string;
  sharedInterests?: string[];
  season?: string;
  restrictions?: string[];
}

// In-memory cache
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting tracking
const rateLimitTracker = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 50; // 50 requests per day per user
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Fallback responses
const FALLBACK_MESSAGE_SUGGESTIONS: MessageSuggestions = {
  casual: "Hey! Hope you're doing well. Just wanted to check in and see how things are going!",
  warm: "Hi there! I've been thinking about you lately and wanted to reach out. How have you been?",
  thoughtful: "I hope this message finds you well. I've been meaning to connect and catch up properly. Would love to hear how you're doing.",
};

const FALLBACK_EVENT_IDEAS: EventIdea[] = [
  {
    name: "Coffee Catch-up",
    description: "Meet at a local café for a relaxed conversation over coffee or tea.",
    estimatedCost: 10,
    duration: "1-2 hours",
    venueType: "indoor",
    tips: ["Choose a quiet café", "Avoid rush hours"],
  },
  {
    name: "Park Walk",
    description: "Take a leisurely walk in a local park while catching up.",
    estimatedCost: 0,
    duration: "1-2 hours",
    venueType: "outdoor",
    tips: ["Check the weather", "Bring water"],
  },
  {
    name: "Game Night",
    description: "Host a casual game night with board games or card games.",
    estimatedCost: 0,
    duration: "2-4 hours",
    venueType: "indoor",
    tips: ["Have snacks ready", "Choose games for your group size"],
  },
];

const FALLBACK_CONVERSATION_STARTERS: ConversationStarter[] = [
  {
    topic: "Recent experiences",
    opener: "What's been the highlight of your week?",
    followUp: "That sounds interesting! Tell me more about it.",
  },
  {
    topic: "Future plans",
    opener: "Any exciting plans coming up?",
    followUp: "That sounds fun! How did you decide on that?",
  },
  {
    topic: "Shared interests",
    opener: "Have you tried anything new lately?",
    followUp: "I'd love to hear more about your experience with that.",
  },
];

const FALLBACK_RELATIONSHIP_TIP: RelationshipTip = {
  title: "The Power of Consistent Check-ins",
  advice: "Research shows that regular, brief interactions strengthen relationships more than occasional long conversations. Try sending a quick message to someone you care about today.",
  actionItem: "Set a weekly reminder to reach out to one person in your inner circle.",
  source: "Social Psychology Research",
};

export class AIService {
  private static openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client
   */
  private static getClient(): OpenAI | null {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ OPENAI_API_KEY not configured. AI features will use fallback responses.');
        return null;
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * Generate cache key from input parameters
   */
  private static getCacheKey(prefix: string, params: any): string {
    const hash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get cached response if available
   */
  private static getFromCache<T>(key: string): T | null {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    cache.delete(key);
    return null;
  }

  /**
   * Store response in cache
   */
  private static setCache(key: string, data: any): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  /**
   * Check and update rate limit for user
   */
  private static checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const userLimit = rateLimitTracker.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      // Reset or initialize
      rateLimitTracker.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW,
      });
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0 };
    }

    userLimit.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count };
  }

  /**
   * Track token usage (for monitoring)
   */
  private static async trackUsage(userId: string, tokens: number, feature: string): Promise<void> {
    try {
      // Store in AI insights table for tracking
      await prisma.aIInsight.create({
        data: {
          userId,
          type: 'TOKEN_USAGE',
          content: JSON.stringify({ tokens, feature }),
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to track AI usage:', error);
    }
  }

  /**
   * Make OpenAI API call with retry logic
   */
  private static async callOpenAI(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;

    const { maxTokens = 500, temperature = 0.7 } = options;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: maxTokens,
          temperature,
        });

        return response.choices[0]?.message?.content || null;
      } catch (error: any) {
        lastError = error;
        
        // Handle rate limiting
        if (error?.status === 429) {
          const retryAfter = parseInt(error?.headers?.['retry-after'] || '5', 10);
          console.warn(`OpenAI rate limited. Retrying in ${retryAfter}s (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        // Handle other retryable errors
        if (error?.status >= 500 && attempt < maxRetries) {
          console.warn(`OpenAI server error. Retrying (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        break;
      }
    }

    console.error('OpenAI API call failed:', lastError);
    return null;
  }

  /**
   * Generate message suggestions for reaching out to a contact
   */
  static async generateMessageSuggestions(
    userId: string,
    contactId: string,
    context: MessageContext = 'general'
  ): Promise<MessageSuggestions> {
    // Check rate limit
    const rateLimit = this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.warn(`User ${userId} exceeded AI rate limit`);
      return FALLBACK_MESSAGE_SUGGESTIONS;
    }

    // Check cache
    const cacheKey = this.getCacheKey('message', { contactId, context });
    const cached = this.getFromCache<MessageSuggestions>(cacheKey);
    if (cached) return cached;

    try {
      // Get contact details
      const contact = await ContactService.getContactWithDetails(contactId);
      if (!contact) return FALLBACK_MESSAGE_SUGGESTIONS;

      const relationship = contact.relationship;
      const lastContactDate = relationship?.lastContactDate;
      const daysSinceContact = lastContactDate
        ? Math.floor((Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const systemPrompt = `You are a helpful assistant that crafts personalized messages for maintaining relationships. 
Generate three message variations based on the relationship context provided.

Guidelines:
- Keep messages authentic and not overly formal
- Adapt tone to relationship tier (Inner Circle = casual, Acquaintance = more formal)
- Include specific references when context allows
- Messages should be 1-3 sentences
- Return JSON format only`;

      const userPrompt = `Generate message suggestions for reaching out to a contact:

Contact Name: ${contact.name}
Relationship Tier: ${relationship?.tier || 'FRIENDS'}
Relationship Type: ${relationship?.type || 'PERSONAL'}
${daysSinceContact ? `Days since last contact: ${daysSinceContact}` : ''}
${contact.interests?.length ? `Shared interests: ${(contact.interests as string[]).join(', ')}` : ''}
Message Context: ${context}

Return a JSON object with three message variations:
{
  "casual": "A friendly, casual message",
  "warm": "A warm, personal message", 
  "thoughtful": "A thoughtful, considerate message"
}`;

      const response = await this.callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 200, temperature: 0.7 }
      );

      if (!response) return FALLBACK_MESSAGE_SUGGESTIONS;

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return FALLBACK_MESSAGE_SUGGESTIONS;

      const suggestions = JSON.parse(jsonMatch[0]) as MessageSuggestions;
      
      // Cache and track
      this.setCache(cacheKey, suggestions);
      await this.trackUsage(userId, 200, 'message_suggestions');

      return suggestions;
    } catch (error) {
      console.error('Generate message suggestions error:', error);
      return FALLBACK_MESSAGE_SUGGESTIONS;
    }
  }

  /**
   * Generate event/activity ideas based on parameters
   */
  static async generateEventIdeas(
    userId: string,
    params: EventIdeaParams
  ): Promise<EventIdea[]> {
    // Check rate limit
    const rateLimit = this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.warn(`User ${userId} exceeded AI rate limit`);
      return FALLBACK_EVENT_IDEAS;
    }

    // Check cache
    const cacheKey = this.getCacheKey('events', params);
    const cached = this.getFromCache<EventIdea[]>(cacheKey);
    if (cached) return cached;

    try {
      const budgetRanges: Record<BudgetTier, string> = {
        FREE: '$0 (free activities only)',
        BUDGET: '$0-20 per person',
        MODERATE: '$20-50 per person',
        PREMIUM: '$50+ per person',
      };

      const systemPrompt = `You are an expert event planner and social coordinator. 
Generate creative, practical event ideas that help people connect.

Guidelines:
- Consider the budget constraints strictly
- Provide variety in venue types (indoor/outdoor, active/relaxed)
- Include practical tips for success
- Make suggestions realistic and achievable
- Return JSON array format only`;

      const userPrompt = `Generate 10 event/activity ideas based on these parameters:

Budget: ${budgetRanges[params.budgetTier]}
Group Size: ${params.groupSize} people
${params.location ? `Location: ${params.location}` : ''}
${params.sharedInterests?.length ? `Shared interests: ${params.sharedInterests.join(', ')}` : ''}
${params.season ? `Season: ${params.season}` : ''}
${params.restrictions?.length ? `Restrictions: ${params.restrictions.join(', ')}` : ''}

Return a JSON array with exactly 10 ideas:
[{
  "name": "Event Name",
  "description": "Brief description of the activity",
  "estimatedCost": 25,
  "duration": "2-3 hours",
  "venueType": "indoor|outdoor|both",
  "tips": ["Helpful tip 1", "Helpful tip 2"]
}, ...]`;

      const response = await this.callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 1000, temperature: 0.8 }
      );

      if (!response) return FALLBACK_EVENT_IDEAS;

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return FALLBACK_EVENT_IDEAS;

      const ideas = JSON.parse(jsonMatch[0]) as EventIdea[];
      
      // Cache and track
      this.setCache(cacheKey, ideas);
      await this.trackUsage(userId, 1000, 'event_ideas');

      return ideas;
    } catch (error) {
      console.error('Generate event ideas error:', error);
      return FALLBACK_EVENT_IDEAS;
    }
  }

  /**
   * Generate conversation starters for a contact
   */
  static async generateConversationStarters(
    userId: string,
    contactId: string
  ): Promise<ConversationStarter[]> {
    // Check rate limit
    const rateLimit = this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return FALLBACK_CONVERSATION_STARTERS;
    }

    // Check cache
    const cacheKey = this.getCacheKey('conversation', { contactId });
    const cached = this.getFromCache<ConversationStarter[]>(cacheKey);
    if (cached) return cached;

    try {
      const contact = await ContactService.getContactWithDetails(contactId);
      if (!contact) return FALLBACK_CONVERSATION_STARTERS;

      const systemPrompt = `You are a social skills coach helping people have meaningful conversations.
Generate conversation starters that feel natural and lead to engaging discussions.

Guidelines:
- Base topics on shared interests when available
- Include an opening question and a follow-up
- Make them feel genuine, not scripted
- Vary the depth (light, medium, deeper)
- Return JSON array format only`;

      const userPrompt = `Generate 5 conversation starters for talking with:

Name: ${contact.name}
${contact.interests?.length ? `Interests: ${(contact.interests as string[]).join(', ')}` : ''}
${contact.notes ? `Notes about them: ${contact.notes}` : ''}

Return a JSON array:
[{
  "topic": "Topic category",
  "opener": "Opening question or statement",
  "followUp": "Follow-up question to deepen conversation"
}, ...]`;

      const response = await this.callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 500, temperature: 0.7 }
      );

      if (!response) return FALLBACK_CONVERSATION_STARTERS;

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return FALLBACK_CONVERSATION_STARTERS;

      const starters = JSON.parse(jsonMatch[0]) as ConversationStarter[];
      
      this.setCache(cacheKey, starters);
      await this.trackUsage(userId, 500, 'conversation_starters');

      return starters;
    } catch (error) {
      console.error('Generate conversation starters error:', error);
      return FALLBACK_CONVERSATION_STARTERS;
    }
  }

  /**
   * Generate a relationship tip based on user's patterns
   */
  static async generateRelationshipTip(userId: string): Promise<RelationshipTip> {
    // Check rate limit
    const rateLimit = this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return FALLBACK_RELATIONSHIP_TIP;
    }

    // Check cache (per user, refreshes daily)
    const cacheKey = this.getCacheKey('tip', { userId, date: new Date().toDateString() });
    const cached = this.getFromCache<RelationshipTip>(cacheKey);
    if (cached) return cached;

    try {
      // Get user's relationship stats
      const [contactCount, innerCircleCount, recentInteractions] = await Promise.all([
        prisma.contact.count({ where: { userId, isDeleted: false } }),
        prisma.relationship.count({ where: { userId, tier: 'INNER_CIRCLE' } }),
        prisma.interaction.count({
          where: {
            relationship: { userId },
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      const systemPrompt = `You are a relationship coach providing evidence-based advice.
Generate a helpful, actionable tip based on the user's relationship patterns.

Guidelines:
- Keep advice practical and specific
- Reference research when relevant
- Include one clear action item
- Be encouraging but realistic
- Return JSON format only`;

      const userPrompt = `Generate a personalized relationship tip for a user with:

Total contacts: ${contactCount}
Inner circle relationships: ${innerCircleCount}
Interactions this week: ${recentInteractions}

Return a JSON object:
{
  "title": "Short catchy title",
  "advice": "2-3 sentences of advice",
  "actionItem": "One specific action to take",
  "source": "Optional: research/psychology source"
}`;

      const response = await this.callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 300, temperature: 0.7 }
      );

      if (!response) return FALLBACK_RELATIONSHIP_TIP;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return FALLBACK_RELATIONSHIP_TIP;

      const tip = JSON.parse(jsonMatch[0]) as RelationshipTip;
      
      this.setCache(cacheKey, tip);
      await this.trackUsage(userId, 300, 'relationship_tip');

      return tip;
    } catch (error) {
      console.error('Generate relationship tip error:', error);
      return FALLBACK_RELATIONSHIP_TIP;
    }
  }

  /**
   * Get user's AI usage stats
   */
  static async getUsageStats(userId: string): Promise<{
    requestsToday: number;
    requestsRemaining: number;
    resetAt: Date;
  }> {
    const userLimit = rateLimitTracker.get(userId);
    
    if (!userLimit || userLimit.resetAt < Date.now()) {
      return {
        requestsToday: 0,
        requestsRemaining: RATE_LIMIT_MAX,
        resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW),
      };
    }

    return {
      requestsToday: userLimit.count,
      requestsRemaining: Math.max(0, RATE_LIMIT_MAX - userLimit.count),
      resetAt: new Date(userLimit.resetAt),
    };
  }

  /**
   * Clear cache (for admin/maintenance)
   */
  static clearCache(): void {
    cache.clear();
    console.log('AI service cache cleared');
  }

  /**
   * Get cache stats
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  }
}
