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
      console.log('🔑 OpenAI API Key status:', apiKey ? `Set (${apiKey.substring(0, 10)}...)` : 'NOT SET');
      if (!apiKey) {
        console.warn('⚠️ OPENAI_API_KEY not configured. AI features will use fallback responses.');
        return null;
      }
      this.openai = new OpenAI({ apiKey });
      console.log('✅ OpenAI client initialized');
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
    console.log('🌐 Calling OpenAI API...');
    const client = this.getClient();
    if (!client) {
      console.warn('❌ No OpenAI client available');
      return null;
    }

    const { maxTokens = 500, temperature = 0.7 } = options;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 OpenAI request attempt ${attempt}/${maxRetries}...`);
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: maxTokens,
          temperature,
        });

        const content = response.choices[0]?.message?.content || null;
        console.log('✅ OpenAI response received:', content ? `${content.substring(0, 100)}...` : 'empty');
        return content;
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
    console.log('🤖 generateMessageSuggestions called:', { userId, contactId, context });
    
    // Check rate limit
    const rateLimit = this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.warn(`User ${userId} exceeded AI rate limit`);
      return FALLBACK_MESSAGE_SUGGESTIONS;
    }

    // Check cache
    const cacheKey = this.getCacheKey('message', { contactId, context });
    const cached = this.getFromCache<MessageSuggestions>(cacheKey);
    if (cached) {
      console.log('📦 Returning cached suggestions');
      return cached;
    }

    try {
      // Get contact details (pass both userId and contactId)
      const contact = await ContactService.getContactWithDetails(userId, contactId);
      console.log('👤 Contact found:', contact ? contact.name : 'NOT FOUND');
      if (!contact) return FALLBACK_MESSAGE_SUGGESTIONS;

      const relationship = contact.relationship;
      const lastContactDate = relationship?.lastContactDate;
      const daysSinceContact = lastContactDate
        ? Math.floor((Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const contextDescriptions: Record<string, string> = {
        'birthday': 'a birthday wish - celebrate their special day',
        'check-in': 'a casual check-in to see how they are doing',
        'congratulations': 'congratulating them on an achievement or good news',
        'thank-you': 'expressing gratitude and thanking them for something',
        'reconnect': 'reconnecting after not talking for a while',
        'holiday': 'holiday greetings and well wishes',
        'sympathy': 'offering support during a difficult time',
        'event-invite': 'inviting them to get together or attend an event',
        'general': 'a general friendly message',
      };

      const contextDescription = contextDescriptions[context] || contextDescriptions['general'];
      
      // Build shared interests context with specifics
      const sharedInterests = contact.interests as string[] || [];
      const interestsContext = sharedInterests.length > 0
        ? `Their shared interests with you: ${sharedInterests.join(', ')}. 
           IMPORTANT: Naturally incorporate one of these interests into each message when relevant. 
           For example, if they like "Football", you might mention a recent game or ask about their team.`
        : '';

      const systemPrompt = `You are a friend helping write GENUINE, HUMAN messages - NOT a corporate assistant.

Your job is to help write messages that sound like they're from a real person who actually cares.

CRITICAL RULES:
1. NEVER use generic phrases like "Hope all is well" or "Just wanted to reach out"
2. NEVER sound like a customer service rep or AI
3. Write like people ACTUALLY text their friends - with personality, humor, and warmth
4. Use contractions naturally (you're, don't, can't, etc.)
5. Include specific references to shared interests when available
6. Vary sentence length and structure - real people don't write perfectly formatted messages
7. It's OK to use casual language, slang, or even emojis for closer relationships
8. Messages for Inner Circle should feel like texts to best friends
9. Each tone should feel distinctly DIFFERENT, not just rephrased

The context is: ${contextDescription}

Return ONLY valid JSON - no explanations.`;

      const userPrompt = `Write ${context.toUpperCase()} messages for my ${relationship?.tier?.replace('_', ' ')?.toLowerCase() || 'friend'} named ${contact.name}.

About this person:
- We've been ${relationship?.type?.toLowerCase() || 'friends'}
- Our relationship level: ${relationship?.tier?.replace('_', ' ') || 'Friends'}
${daysSinceContact ? `- Haven't talked in ${daysSinceContact} days` : ''}
${interestsContext}
${contact.notes ? `- Personal notes: ${contact.notes}` : ''}

Write 3 genuinely different messages:

{
  "casual": "Write like texting a friend - brief, maybe with humor or a reference to shared interests",
  "warm": "More heartfelt but still natural - shows you've been thinking of them",
  "thoughtful": "Deeper, more meaningful - but still sounds like YOU wrote it, not a greeting card"
}

Remember: These should sound like a real human wrote them, not AI. Use their name if it feels natural.`;

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
      const contact = await ContactService.getContactWithDetails(userId, contactId);
      if (!contact) return FALLBACK_CONVERSATION_STARTERS;

      const interests = contact.interests as string[] || [];
      const hasInterests = interests.length > 0;

      const systemPrompt = `You are helping someone have REAL conversations with their ${contact.relationship?.tier?.replace('_', ' ')?.toLowerCase() || 'friend'}.

CRITICAL RULES:
1. These should sound like things a real person would actually SAY - not interview questions
2. NEVER use phrases like "So tell me about..." or "I'd love to hear about..."
3. Openers should feel natural, like you're just chatting
4. Consider current events, seasons, or trending topics when relevant
5. If they have shared interests, make SPECIFIC references to those interests
6. Follow-ups should flow naturally, like you're genuinely curious
7. Mix depths: some light/fun, some deeper/meaningful
8. For close relationships, be more casual and fun

Return ONLY valid JSON array - no explanations.`;

      const userPrompt = `Create 5 conversation starters for ${contact.name}:

${hasInterests ? `IMPORTANT - Shared interests to incorporate: ${interests.join(', ')}
Use these interests to make conversations SPECIFIC and relevant!` : 'No specific interests noted - keep it general but genuine'}

${contact.notes ? `Things I know about them: ${contact.notes}` : ''}
Relationship closeness: ${contact.relationship?.tier?.replace('_', ' ') || 'Friends'}

Return a JSON array:
[{
  "topic": "What this conversation is about",
  "opener": "A natural way to start this convo - like you'd actually say it",
  "followUp": "What you might say next if they respond positively"
}, ...]

Make each one feel different - some fun/light, some thoughtful. ${hasInterests ? `At least 3 should reference their interests: ${interests.join(', ')}` : ''}`;

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
      // Get user's relationship stats and contacts needing attention
      const [contactCount, innerCircleCount, recentInteractions, neglectedContacts] = await Promise.all([
        prisma.contact.count({ where: { userId, isDeleted: false } }),
        prisma.relationship.count({ where: { userId, tier: 'INNER_CIRCLE' } }),
        prisma.interaction.count({
          where: {
            relationship: { userId },
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        // Get contacts that haven't been contacted recently
        prisma.relationship.findMany({
          where: {
            userId,
            tier: { in: ['INNER_CIRCLE', 'CLOSE_FRIENDS'] },
            OR: [
              { lastContactDate: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
              { lastContactDate: null }
            ]
          },
          include: {
            contact: { select: { name: true } }
          },
          take: 3
        })
      ]);

      const neglectedNames = neglectedContacts.map(r => r.contact.name);
      const hasNeglectedContacts = neglectedNames.length > 0;

      const systemPrompt = `You are a wise relationship advisor who combines timeless wisdom with practical modern advice.

Your tips should:
1. Feel INSIGHTFUL and meaningful - not generic self-help clichés
2. Include a relevant QUOTE, PROVERB, or piece of wisdom (from philosophy, literature, various cultures)
3. Be specifically tailored to the user's actual situation
4. Drive home WHY relationships matter - emotionally and practically
5. Include ONE specific, actionable step they can take TODAY
6. Reference research/psychology when it adds credibility

Quotes can come from:
- Ancient philosophers (Aristotle, Seneca, Confucius)
- Modern thinkers and authors
- Cultural proverbs from around the world
- Poetry and literature
- Psychology research findings

Return ONLY valid JSON.`;

      const userPrompt = `Create today's personalized relationship insight for someone with:

Stats:
- ${contactCount} contacts total
- ${innerCircleCount} in their inner circle  
- ${recentInteractions} interactions this week

${hasNeglectedContacts ? `
⚠️ IMPORTANT: These close friends/family haven't heard from them recently:
${neglectedNames.map(n => `- ${n}`).join('\n')}

The tip should gently encourage reaching out to these specific people.
` : ''}

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.

Return:
{
  "title": "Compelling 3-6 word title",
  "advice": "2-3 sentences mixing wisdom with practical insight. ${hasNeglectedContacts ? `Subtly mention that ${neglectedNames[0]} might appreciate hearing from them.` : ''} Include a relevant quote or proverb naturally woven in.",
  "actionItem": "One specific thing to do TODAY - be concrete",
  "source": "Attribution for quote OR relevant research finding"
}`;

      const response = await this.callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 400, temperature: 0.8 }
      );

      if (!response) return FALLBACK_RELATIONSHIP_TIP;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return FALLBACK_RELATIONSHIP_TIP;

      const tip = JSON.parse(jsonMatch[0]) as RelationshipTip;
      
      this.setCache(cacheKey, tip);
      await this.trackUsage(userId, 400, 'relationship_tip');

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
