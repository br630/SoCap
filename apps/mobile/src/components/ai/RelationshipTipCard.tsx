import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RelationshipTip } from '../../services/aiService';

interface RelationshipTipCardProps {
  tip: RelationshipTip | null;
  isLoading?: boolean;
  onDismiss?: () => void;
  onRefresh?: () => void;
}

function getCategoryEmoji(category: string): string {
  switch (category.toUpperCase()) {
    case 'CONNECTION':
      return '🤝';
    case 'COMMUNICATION':
      return '💬';
    case 'APPRECIATION':
      return '❤️';
    case 'QUALITY_TIME':
      return '⏰';
    case 'GROWTH':
      return '🌱';
    case 'BOUNDARIES':
      return '🛡️';
    case 'CONFLICT':
      return '🕊️';
    default:
      return '💡';
  }
}

function getCategoryColor(category: string): string {
  switch (category.toUpperCase()) {
    case 'CONNECTION':
      return '#4CAF50';
    case 'COMMUNICATION':
      return '#2196F3';
    case 'APPRECIATION':
      return '#E91E63';
    case 'QUALITY_TIME':
      return '#FF9800';
    case 'GROWTH':
      return '#8BC34A';
    case 'BOUNDARIES':
      return '#9C27B0';
    case 'CONFLICT':
      return '#607D8B';
    default:
      return '#7C4DFF';
  }
}

export function RelationshipTipCard({
  tip,
  isLoading = false,
  onDismiss,
  onRefresh,
}: RelationshipTipCardProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleLearnMore = () => {
    if (tip?.researchSource) {
      // Search for the research source on Google Scholar
      const searchQuery = encodeURIComponent(tip.researchSource);
      Linking.openURL(`https://scholar.google.com/scholar?q=${searchQuery}`);
    }
  };

  // Already dismissed
  if (dismissed) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#7C4DFF" />
          <Text style={styles.loadingText}>Getting today's tip...</Text>
        </View>
      </View>
    );
  }

  // No tip available
  if (!tip) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="bulb-outline" size={32} color="#ccc" />
          <Text style={styles.emptyText}>No tip available</Text>
          {onRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Get Tip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const categoryColor = getCategoryColor(tip.category);
  const categoryEmoji = getCategoryEmoji(tip.category);

  return (
    <View style={[styles.container, { borderLeftColor: categoryColor }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{categoryEmoji}</Text>
          <Text style={styles.title}>Daily Relationship Tip</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
        <Text style={[styles.categoryText, { color: categoryColor }]}>
          {tip.category.replace('_', ' ')}
        </Text>
      </View>

      <Text style={styles.tipText}>{tip.tip}</Text>

      {tip.researchSource && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.sourceLink}
            onPress={handleLearnMore}
          >
            <Ionicons name="school-outline" size={14} color="#666" />
            <Text style={styles.sourceText} numberOfLines={1}>
              {tip.researchSource}
            </Text>
            <Ionicons name="open-outline" size={12} color="#7C4DFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        {onRefresh && (
          <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={16} color="#7C4DFF" />
            <Text style={styles.actionText}>New Tip</Text>
          </TouchableOpacity>
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
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dismissButton: {
    padding: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  actionText: {
    fontSize: 13,
    color: '#7C4DFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  refreshButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#7C4DFF',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default RelationshipTipCard;
