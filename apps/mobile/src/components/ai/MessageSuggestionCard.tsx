import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { MessageSuggestions } from '../../services/aiService';

interface MessageOption {
  key: keyof MessageSuggestions;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MESSAGE_OPTIONS: MessageOption[] = [
  { key: 'casual', label: 'Casual', icon: 'happy-outline', color: '#4CAF50' },
  { key: 'warm', label: 'Warm', icon: 'heart-outline', color: '#FF6B6B' },
  { key: 'thoughtful', label: 'Thoughtful', icon: 'sparkles-outline', color: '#7C4DFF' },
];

interface MessageSuggestionCardProps {
  suggestions: MessageSuggestions | null;
  contactName?: string;
  isLoading?: boolean;
  insightId?: string;
  onFeedback?: (insightId: string, wasUsed: boolean, feedback?: string) => void;
  onRefresh?: () => void;
}

export function MessageSuggestionCard({
  suggestions,
  contactName = 'your friend',
  isLoading = false,
  insightId,
  onFeedback,
  onRefresh,
}: MessageSuggestionCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);

  const handleCopy = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    
    // Mark as used when copied
    if (insightId && onFeedback) {
      onFeedback(insightId, true);
    }
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({ message: text });
      
      // Mark as used when shared
      if (insightId && onFeedback) {
        onFeedback(insightId, true);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful ? 'helpful' : 'not_helpful');
    if (insightId && onFeedback) {
      onFeedback(insightId, false, helpful ? 'helpful' : 'not_helpful');
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>✨ AI Message Ideas</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C4DFF" />
          <Text style={styles.loadingText}>
            Crafting personalized messages for {contactName}...
          </Text>
        </View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonHeader} />
            <View style={styles.skeletonText} />
            <View style={[styles.skeletonText, { width: '70%' }]} />
          </View>
        ))}
      </View>
    );
  }

  if (!suggestions) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="bulb-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No suggestions available</Text>
          {onRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Get Suggestions</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✨ AI Message Ideas</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
            <Ionicons name="refresh-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {MESSAGE_OPTIONS.map((option) => {
        const message = suggestions[option.key];
        const isCopied = copiedKey === option.key;

        return (
          <View key={option.key} style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <View style={[styles.labelBadge, { backgroundColor: option.color + '20' }]}>
                <Ionicons name={option.icon} size={14} color={option.color} />
                <Text style={[styles.labelText, { color: option.color }]}>
                  {option.label}
                </Text>
              </View>
            </View>

            <Text style={styles.messageText}>{message}</Text>

            <View style={styles.messageActions}>
              <TouchableOpacity
                style={[styles.actionButton, isCopied && styles.actionButtonActive]}
                onPress={() => handleCopy(message, option.key)}
              >
                <Ionicons
                  name={isCopied ? 'checkmark' : 'copy-outline'}
                  size={16}
                  color={isCopied ? '#4CAF50' : '#666'}
                />
                <Text style={[styles.actionText, isCopied && styles.actionTextActive]}>
                  {isCopied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShare(message)}
              >
                <Ionicons name="share-outline" size={16} color="#666" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Feedback section */}
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Were these suggestions helpful?</Text>
        <View style={styles.feedbackButtons}>
          <TouchableOpacity
            style={[
              styles.feedbackButton,
              feedbackGiven === 'helpful' && styles.feedbackButtonActive,
            ]}
            onPress={() => handleFeedback(true)}
            disabled={feedbackGiven !== null}
          >
            <Ionicons
              name="thumbs-up-outline"
              size={18}
              color={feedbackGiven === 'helpful' ? '#4CAF50' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.feedbackButton,
              feedbackGiven === 'not_helpful' && styles.feedbackButtonActiveNegative,
            ]}
            onPress={() => handleFeedback(false)}
            disabled={feedbackGiven !== null}
          >
            <Ionicons
              name="thumbs-down-outline"
              size={18}
              color={feedbackGiven === 'not_helpful' ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
        </View>
        {feedbackGiven && (
          <Text style={styles.feedbackThanks}>Thanks for your feedback!</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  refreshIcon: {
    padding: 4,
  },
  messageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  messageActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  actionText: {
    fontSize: 13,
    color: '#666',
  },
  actionTextActive: {
    color: '#4CAF50',
  },
  feedbackSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  feedbackLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  feedbackButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  feedbackButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  feedbackButtonActiveNegative: {
    backgroundColor: '#FFEBEE',
  },
  feedbackThanks: {
    marginTop: 8,
    fontSize: 12,
    color: '#4CAF50',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  skeletonCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  skeletonHeader: {
    width: 80,
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 10,
  },
  skeletonText: {
    width: '100%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  refreshButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#7C4DFF',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default MessageSuggestionCard;
