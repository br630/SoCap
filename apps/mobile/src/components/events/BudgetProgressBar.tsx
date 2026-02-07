import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { BudgetTier } from '../../services/eventService';

interface BudgetProgressBarProps {
  estimatedCost: number;
  actualCost?: number | null;
  budgetTier: BudgetTier;
  compact?: boolean;
}

const TIER_CONFIG: Record<BudgetTier, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  FREE: { color: '#4CAF50', label: 'Free', icon: 'gift-outline' },
  BUDGET: { color: '#8BC34A', label: 'Budget', icon: 'wallet-outline' },
  MODERATE: { color: '#FF9800', label: 'Moderate', icon: 'card-outline' },
  PREMIUM: { color: '#9C27B0', label: 'Premium', icon: 'diamond-outline' },
};

export default function BudgetProgressBar({
  estimatedCost,
  actualCost,
  budgetTier,
  compact = false,
}: BudgetProgressBarProps) {
  const theme = useTheme();
  const tierConfig = TIER_CONFIG[budgetTier] || TIER_CONFIG.MODERATE;
  
  // Ensure values are numbers
  const estimated = Number(estimatedCost) || 0;
  const spent = Number(actualCost) || 0;
  const progress = estimated > 0 ? Math.min(spent / estimated, 1) : 0;
  const remaining = Math.max(estimated - spent, 0);
  const isOverBudget = spent > estimated;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.tierBadge, { backgroundColor: `${tierConfig.color}20` }]}>
          <Ionicons name={tierConfig.icon} size={12} color={tierConfig.color} />
          <Text style={[styles.tierText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
        </View>
        <Text style={styles.compactCost}>
          ${spent.toFixed(0)} / ${estimated.toFixed(0)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" size={18} color="#666" />
          <Text style={styles.title}>Budget</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: `${tierConfig.color}20` }]}>
          <Ionicons name={tierConfig.icon} size={14} color={tierConfig.color} />
          <Text style={[styles.tierText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={progress}
          color={isOverBudget ? '#F44336' : tierConfig.color}
          style={styles.progressBar}
        />
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Estimated</Text>
          <Text style={styles.detailValue}>${estimated.toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Spent</Text>
          <Text style={[styles.detailValue, isOverBudget && styles.overBudget]}>
            ${spent.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Remaining</Text>
          <Text style={[styles.detailValue, isOverBudget && styles.overBudget]}>
            {isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Over budget warning */}
      {isOverBudget && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color="#F44336" />
          <Text style={styles.warningText}>
            Over budget by ${(spent - estimated).toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

// Simple tier badge for list items
export function BudgetTierBadge({ tier }: { tier: BudgetTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <View style={[styles.tierBadge, { backgroundColor: `${config.color}20` }]}>
      <Ionicons name={config.icon} size={12} color={config.color} />
      <Text style={[styles.tierText, { color: config.color, fontSize: 11 }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  overBudget: {
    color: '#F44336',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactCost: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
