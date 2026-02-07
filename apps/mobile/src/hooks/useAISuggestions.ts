import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import aiService, {
  MessageContext,
  EventIdeasParams,
  FeedbackData,
  MessageSuggestionsResponse,
  EventIdeasResponse,
  ConversationStartersResponse,
  RelationshipTipResponse,
  UsageStats,
  InsightHistoryItem,
} from '../services/aiService';

// Query keys for caching
export const AI_QUERY_KEYS = {
  messageSuggestions: (contactId: string, context: MessageContext) => 
    ['ai', 'messages', contactId, context],
  eventIdeas: (params: EventIdeasParams) => 
    ['ai', 'events', JSON.stringify(params)],
  conversationStarters: (contactId: string) => 
    ['ai', 'starters', contactId],
  relationshipTip: () => ['ai', 'tip'],
  usageStats: () => ['ai', 'usage'],
  insightHistory: (type?: string) => ['ai', 'history', type],
};

// Cache time: 24 hours for AI responses
const STALE_TIME = 24 * 60 * 60 * 1000;

/**
 * Hook for getting AI message suggestions
 */
export function useMessageSuggestions(
  contactId: string | null,
  context: MessageContext = 'check-in',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.messageSuggestions(contactId || '', context),
    queryFn: () => aiService.getMessageSuggestions(contactId!, context),
    enabled: !!contactId && (options?.enabled !== false),
    staleTime: STALE_TIME,
    retry: 1,
    meta: {
      errorMessage: 'Failed to get message suggestions',
    },
  });
}

/**
 * Hook for getting AI event ideas
 */
export function useEventIdeas(
  params: EventIdeasParams | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.eventIdeas(params!),
    queryFn: () => aiService.getEventIdeas(params!),
    enabled: !!params && (options?.enabled !== false),
    staleTime: STALE_TIME,
    retry: 1,
    meta: {
      errorMessage: 'Failed to get event ideas',
    },
  });
}

/**
 * Hook for getting conversation starters
 */
export function useConversationStarters(
  contactId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversationStarters(contactId || ''),
    queryFn: () => aiService.getConversationStarters(contactId!),
    enabled: !!contactId && (options?.enabled !== false),
    staleTime: STALE_TIME,
    retry: 1,
    meta: {
      errorMessage: 'Failed to get conversation starters',
    },
  });
}

/**
 * Hook for getting daily relationship tip
 */
export function useRelationshipTip(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.relationshipTip(),
    queryFn: () => aiService.getRelationshipTip(),
    enabled: options?.enabled !== false,
    staleTime: STALE_TIME,
    retry: 1,
    meta: {
      errorMessage: 'Failed to get relationship tip',
    },
  });
}

/**
 * Hook for getting usage stats
 */
export function useAIUsageStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.usageStats(),
    queryFn: () => aiService.getUsageStats(),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook for getting insight history
 */
export function useInsightHistory(
  type?: string,
  options?: { enabled?: boolean; limit?: number }
) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.insightHistory(type),
    queryFn: () => aiService.getInsightHistory({ type, limit: options?.limit }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook for submitting feedback on AI suggestions
 */
export function useAIFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FeedbackData) => aiService.submitFeedback(data),
    onSuccess: () => {
      // Invalidate history to show updated feedback
      queryClient.invalidateQueries({ queryKey: ['ai', 'history'] });
    },
  });
}

/**
 * Hook for manually fetching message suggestions (imperative)
 */
export function useFetchMessageSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      context 
    }: { 
      contactId: string; 
      context: MessageContext 
    }) => {
      const result = await aiService.getMessageSuggestions(contactId, context);
      // Update cache
      queryClient.setQueryData(
        AI_QUERY_KEYS.messageSuggestions(contactId, context),
        result
      );
      return result;
    },
  });
}

/**
 * Hook for manually fetching event ideas (imperative)
 */
export function useFetchEventIdeas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: EventIdeasParams) => {
      const result = await aiService.getEventIdeas(params);
      // Update cache
      queryClient.setQueryData(
        AI_QUERY_KEYS.eventIdeas(params),
        result
      );
      return result;
    },
  });
}

/**
 * Hook for manually fetching conversation starters (imperative)
 */
export function useFetchConversationStarters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const result = await aiService.getConversationStarters(contactId);
      // Update cache
      queryClient.setQueryData(
        AI_QUERY_KEYS.conversationStarters(contactId),
        result
      );
      return result;
    },
  });
}

/**
 * Combined hook for all AI features in a contact context
 */
export function useContactAI(contactId: string | null) {
  const [currentContext, setCurrentContext] = React.useState<MessageContext>('check-in');
  const messageSuggestions = useMessageSuggestions(contactId, currentContext, { enabled: false });
  const conversationStarters = useConversationStarters(contactId, { enabled: false });
  const fetchMessages = useFetchMessageSuggestions();
  const fetchStarters = useFetchConversationStarters();
  const feedback = useAIFeedback();
  const queryClient = useQueryClient();

  return {
    // Message suggestions
    messageSuggestions: messageSuggestions.data,
    isLoadingMessages: messageSuggestions.isLoading || fetchMessages.isPending,
    fetchMessageSuggestions: async (context: MessageContext = 'check-in') => {
      if (contactId) {
        setCurrentContext(context); // Update the context so we read from the right cache
        const result = await fetchMessages.mutateAsync({ contactId, context });
        // Also update the query cache for this context
        queryClient.setQueryData(
          AI_QUERY_KEYS.messageSuggestions(contactId, context),
          result
        );
        return result;
      }
      return Promise.reject(new Error('No contact selected'));
    },

    // Conversation starters
    conversationStarters: conversationStarters.data,
    isLoadingStarters: conversationStarters.isLoading || fetchStarters.isPending,
    fetchConversationStarters: () => {
      if (contactId) {
        return fetchStarters.mutateAsync(contactId);
      }
      return Promise.reject(new Error('No contact selected'));
    },

    // Feedback
    submitFeedback: feedback.mutate,
    isSubmittingFeedback: feedback.isPending,
  };
}
