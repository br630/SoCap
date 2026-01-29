import React from 'react';
import { Badge } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export type RelationshipTier = 'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL';

interface TierBadgeProps {
  tier: RelationshipTier;
  size?: 'small' | 'medium' | 'large';
}

const tierConfig: Record<RelationshipTier, { label: string; color: string }> = {
  INNER_CIRCLE: { label: 'Inner Circle', color: '#E91E63' },
  CLOSE_FRIENDS: { label: 'Close Friends', color: '#9C27B0' },
  FRIENDS: { label: 'Friends', color: '#2196F3' },
  ACQUAINTANCES: { label: 'Acquaintances', color: '#4CAF50' },
  PROFESSIONAL: { label: 'Professional', color: '#FF9800' },
};

export default function TierBadge({ tier, size = 'small' }: TierBadgeProps) {
  const config = tierConfig[tier];

  return (
    <Badge
      style={[
        styles.badge,
        { backgroundColor: config.color },
        size === 'large' && styles.badgeLarge,
        size === 'medium' && styles.badgeMedium,
      ]}
      size={size === 'large' ? 20 : size === 'medium' ? 16 : 14}
    >
      {config.label}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  badgeMedium: {
    paddingHorizontal: 8,
  },
  badgeLarge: {
    paddingHorizontal: 12,
  },
});
