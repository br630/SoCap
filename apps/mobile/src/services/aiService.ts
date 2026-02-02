import { apiClient } from '../config/api';

// Types
export interface MessageSuggestions {
  casual: string;
  warm: string;
  thoughtful: string;
}

export interface MessageSuggestionsResponse {
  suggestions: MessageSuggestions;
  insightId: string;
  contactName: string;
  cached: boolean;
}

export type MessageContext = 
  | 'check-in' 
  | 'birthday' 
  | 'event-invite' 
  | 'holiday' 
  | 'congratulations' 
  | 'sympathy' 
  | 'thank-you'
  | 'reconnect';

export type BudgetTier = 'FREE' | 'BUDGET' | 'MODERATE' | 'PREMIUM';

export interface EventIdea {
  name: string;
  description: string;
  estimatedCost: number;
  duration: string;
  venueType: string;
  tips: string[];
}

export interface EventIdeasParams {
  budgetTier: BudgetTier;
  groupSize: number;
  location?: string;
  interests?: string[];
  restrictions?: string[];
}

export interface EventIdeasResponse {
  ideas: EventIdea[];
  insightId: string;
  cached: boolean;
}

export interface ConversationStartersResponse {
  starters: string[];
  insightId: string;
  contactName: string;
  cached: boolean;
}

export interface RelationshipTip {
  tip: string;
  category: string;
  researchSource?: string;
}

export interface RelationshipTipResponse {
  tip: RelationshipTip;
  insightId: string;
  cached: boolean;
}

export interface UsageStats {
  today: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface InsightHistoryItem {
  id: string;
  type: string;
  content: any;
  wasUsed: boolean;
  feedback?: string;
  createdAt: string;
}

export interface FeedbackData {
  insightId: string;
  wasUsed: boolean;
  feedback?: string;
}

// Fallback responses for when API fails or rate limit exceeded
const fallbackMessageSuggestions: MessageSuggestions = {
  casual: "Hey! Just thinking of you and wanted to say hi. Hope you're doing well! 😊",
  warm: "Hi! It's been a while since we last caught up. I'd love to hear how things are going with you.",
  thoughtful: "I've been meaning to reach out and let you know I've been thinking about you. Life gets busy, but you're never far from my thoughts.",
};

const fallbackConversationStarters: string[] = [
  "What's the most interesting thing that happened to you this week?",
  "Have you watched/read anything good lately?",
  "Any exciting plans coming up?",
  "What's been keeping you busy these days?",
  "How's everything going with your family?",
];

const fallbackRelationshipTip: RelationshipTip = {
  tip: "Research shows that small, consistent touchpoints are more impactful than occasional grand gestures. Try sending a quick thinking-of-you message to someone you haven't spoken to in a while.",
  category: "CONNECTION",
  researchSource: "Journal of Social and Personal Relationships",
};

class AIService {
  /**
   * Get AI-generated message suggestions for a contact
   */
  async getMessageSuggestions(
    contactId: string,
    context: MessageContext = 'check-in'
  ): Promise<MessageSuggestionsResponse> {
    try {
      const response = await apiClient.post<MessageSuggestionsResponse>(
        '/ai/message-suggestions',
        { contactId, context }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting message suggestions:', error);
      
      // Return fallback if API fails
      if (error.response?.status === 429) {
        throw new Error('Daily AI limit reached. Try again tomorrow!');
      }
      
      // Return fallback suggestions
      return {
        suggestions: fallbackMessageSuggestions,
        insightId: '',
        contactName: 'your friend',
        cached: false,
      };
    }
  }

  /**
   * Get AI-generated event ideas
   */
  async getEventIdeas(params: EventIdeasParams): Promise<EventIdeasResponse> {
    try {
      const response = await apiClient.post<EventIdeasResponse>(
        '/ai/event-ideas',
        params
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting event ideas:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Daily AI limit reached. Try again tomorrow!');
      }
      
      // Return fallback event ideas
      return {
        ideas: [
          {
            name: 'Coffee Catch-up',
            description: 'Meet at a cozy local café for good conversation',
            estimatedCost: params.budgetTier === 'FREE' ? 0 : 15,
            duration: '1-2 hours',
            venueType: 'indoor',
            tips: ['Choose a quiet corner', 'Bring conversation topics'],
          },
          {
            name: 'Park Picnic',
            description: 'Pack some snacks and enjoy the outdoors together',
            estimatedCost: 20,
            duration: '2-3 hours',
            venueType: 'outdoor',
            tips: ['Check the weather', 'Bring a blanket', 'Pack easy finger foods'],
          },
          {
            name: 'Game Night',
            description: 'Host a fun evening of board games or card games',
            estimatedCost: params.budgetTier === 'FREE' ? 0 : 25,
            duration: '3-4 hours',
            venueType: 'indoor',
            tips: ['Have snacks ready', 'Pick games for your group size', 'Keep it casual'],
          },
        ],
        insightId: '',
        cached: false,
      };
    }
  }

  /**
   * Get conversation starters for a specific contact
   */
  async getConversationStarters(contactId: string): Promise<ConversationStartersResponse> {
    try {
      const response = await apiClient.get<ConversationStartersResponse>(
        `/ai/conversation-starters/${contactId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting conversation starters:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Daily AI limit reached. Try again tomorrow!');
      }
      
      return {
        starters: fallbackConversationStarters,
        insightId: '',
        contactName: 'your friend',
        cached: false,
      };
    }
  }

  /**
   * Get a daily relationship tip
   */
  async getRelationshipTip(): Promise<RelationshipTipResponse> {
    try {
      const response = await apiClient.get<RelationshipTipResponse>(
        '/ai/relationship-tip'
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting relationship tip:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Daily AI limit reached. Try again tomorrow!');
      }
      
      return {
        tip: fallbackRelationshipTip,
        insightId: '',
        cached: false,
      };
    }
  }

  /**
   * Submit feedback on AI suggestions
   */
  async submitFeedback(data: FeedbackData): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/ai/feedback',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return { success: false };
    }
  }

  /**
   * Get usage statistics for the current user
   */
  async getUsageStats(): Promise<UsageStats> {
    try {
      const response = await apiClient.get<UsageStats>('/ai/usage-stats');
      return response.data;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        today: 0,
        limit: 50,
        remaining: 50,
        resetAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get history of AI insights
   */
  async getInsightHistory(
    options?: { type?: string; limit?: number }
  ): Promise<InsightHistoryItem[]> {
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.limit) params.append('limit', options.limit.toString());
      
      const response = await apiClient.get<{ insights: InsightHistoryItem[] }>(
        `/ai/insight-history?${params}`
      );
      return response.data.insights;
    } catch (error) {
      console.error('Error getting insight history:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
export default aiService;
