import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme/paperTheme';

export type RelationshipTier = 'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL';

interface TierBadgeProps {
  tier: RelationshipTier;
  size?: 'small' | 'medium' | 'large';
}

const tierConfig: Record<RelationshipTier, { label: string; color: string }> = {
  INNER_CIRCLE: { label: 'Inner Circle', color: colors.tierInnerCircle },
  CLOSE_FRIENDS: { label: 'Close Friend', color: colors.tierCloseFriends },
  FRIENDS: { label: 'Friend', color: colors.tierFriends },
  ACQUAINTANCES: { label: 'Acquaintance', color: colors.tierAcquaintances },
  PROFESSIONAL: { label: 'Professional', color: colors.tierProfessional },
};

export default function TierBadge({ tier, size = 'small' }: TierBadgeProps) {
  const config = tierConfig[tier];
  // 15% opacity background per design system Status Chip spec
  const bgColor = config.color + '26';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: bgColor },
      size === 'large' && styles.badgeLarge,
      size === 'medium' && styles.badgeMedium,
    ]}>
      <Text style={[
        styles.badgeText,
        { color: config.color },
        size === 'large' && styles.badgeTextLarge,
        size === 'medium' && styles.badgeTextMedium,
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    height: 28,
    justifyContent: 'center',
  },
  badgeMedium: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    height: 32,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeTextMedium: {
    fontSize: 13,
  },
  badgeTextLarge: {
    fontSize: 15,
  },
});
