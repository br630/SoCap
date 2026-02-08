import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventIdea } from '../../services/aiService';

interface EventIdeaCardProps {
  ideas: EventIdea[] | null;
  isLoading?: boolean;
  onSelectIdea?: (idea: EventIdea) => void;
  onRefresh?: () => void;
}

function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  return `$${cost}`;
}

function getVenueIcon(venueType: string): keyof typeof Ionicons.glyphMap {
  switch (venueType.toLowerCase()) {
    case 'outdoor':
      return 'leaf-outline';
    case 'indoor':
      return 'home-outline';
    case 'restaurant':
      return 'restaurant-outline';
    case 'bar':
      return 'wine-outline';
    case 'online':
      return 'videocam-outline';
    default:
      return 'location-outline';
  }
}

function EventIdeaItem({
  idea,
  onSelect,
}: {
  idea: EventIdea;
  onSelect?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.ideaCard}>
      <TouchableOpacity
        style={styles.ideaHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.ideaMain}>
          <Text style={styles.ideaName}>{idea.name}</Text>
          <View style={styles.ideaMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{formatCost(idea.estimatedCost)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{idea.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name={getVenueIcon(idea.venueType)} size={14} color="#666" />
              <Text style={styles.metaText}>{idea.venueType}</Text>
            </View>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.ideaDetails}>
          <Text style={styles.ideaDescription}>{idea.description}</Text>

          {idea.tips && idea.tips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Tips</Text>
              {idea.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {onSelect && (
            <TouchableOpacity style={styles.useButton} onPress={onSelect}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.useButtonText}>Use This Idea</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export function EventIdeaCard({
  ideas,
  isLoading = false,
  onSelectIdea,
  onRefresh,
}: EventIdeaCardProps) {
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Event Ideas</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>
            Finding perfect event ideas for you...
          </Text>
        </View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonMeta} />
          </View>
        ))}
      </View>
    );
  }

  // Empty state
  if (!ideas || ideas.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="bulb-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No event ideas yet</Text>
          {onRefresh && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Get Ideas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Event Ideas</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
            <Ionicons name="refresh-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={ideas}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <EventIdeaItem
            idea={item}
            onSelect={onSelectIdea ? () => onSelectIdea(item) : undefined}
          />
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
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
  listContent: {
    gap: 12,
  },
  ideaCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ideaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  ideaMain: {
    flex: 1,
  },
  ideaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  ideaMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  ideaDetails: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  ideaDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginTop: 12,
  },
  tipsSection: {
    marginTop: 14,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tipBullet: {
    color: '#666',
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 14,
    gap: 6,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  skeletonTitle: {
    width: '60%',
    height: 18,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonMeta: {
    width: '80%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
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
    backgroundColor: '#5856D6',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default EventIdeaCard;
