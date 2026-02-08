import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { EventTemplate, BudgetTier } from '../../services/eventService';
import { BudgetTierBadge } from './BudgetProgressBar';

interface EventTemplateCardProps {
  template: EventTemplate;
  onPress: () => void;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  social: '#5AC8FA',
  outdoor: '#34C759',
  celebration: '#E91E63',
  professional: '#8E8E93',
  wellness: '#00BCD4',
  entertainment: '#9C27B0',
  holiday: '#FF5722',
};

export default function EventTemplateCard({ template, onPress, compact = false }: EventTemplateCardProps) {
  const categoryColor = CATEGORY_COLORS[template.category] || '#666';

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactCard}>
          <Text style={styles.icon}>{template.icon}</Text>
          <View style={styles.compactContent}>
            <Text style={styles.compactName} numberOfLines={1}>
              {template.name}
            </Text>
            <View style={styles.compactMeta}>
              <Text style={styles.compactCategory}>{template.category}</Text>
              <Text style={styles.compactCost}>
                ${template.estimatedCostRange.min} - ${template.estimatedCostRange.max}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.content}>
          {/* Icon & Category */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}15` }]}>
              <Text style={styles.iconLarge}>{template.icon}</Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryText}>{template.category}</Text>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={styles.name}>{template.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {template.description}
          </Text>

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                {template.suggestedDuration} mins
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="wallet-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                ${template.estimatedCostRange.min} - ${template.estimatedCostRange.max}
              </Text>
            </View>
          </View>

          {/* Budget Tier */}
          <View style={styles.footer}>
            <BudgetTierBadge tier={template.suggestedBudgetTier} />
            <Ionicons name="arrow-forward" size={18} color={categoryColor} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// Category header for grouped templates
export function TemplateCategoryHeader({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#666';
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <View style={styles.categoryHeader}>
      <View style={[styles.categoryIndicator, { backgroundColor: color }]} />
      <Text style={styles.categoryLabel}>{categoryLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLarge: {
    fontSize: 24,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 10,
  },
  details: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  compactCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  compactCost: {
    fontSize: 12,
    color: '#999',
  },
  // Category header styles
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  categoryIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
