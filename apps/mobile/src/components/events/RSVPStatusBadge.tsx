import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { RSVPStatus } from '../../services/eventService';

interface RSVPStatusBadgeProps {
  status: RSVPStatus;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showLabel?: boolean;
}

const RSVP_CONFIG: Record<
  RSVPStatus,
  { color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  PENDING: {
    color: '#F57C00',
    bgColor: '#FFF3E0',
    icon: 'time-outline',
    label: 'Pending',
  },
  CONFIRMED: {
    color: '#388E3C',
    bgColor: '#E8F5E9',
    icon: 'checkmark-circle',
    label: 'Confirmed',
  },
  DECLINED: {
    color: '#D32F2F',
    bgColor: '#FFEBEE',
    icon: 'close-circle',
    label: 'Declined',
  },
  MAYBE: {
    color: '#7B1FA2',
    bgColor: '#F3E5F5',
    icon: 'help-circle',
    label: 'Maybe',
  },
};

const SIZES = {
  small: { padding: 4, fontSize: 10, iconSize: 12 },
  medium: { padding: 6, fontSize: 12, iconSize: 14 },
  large: { padding: 8, fontSize: 14, iconSize: 16 },
};

export default function RSVPStatusBadge({
  status,
  size = 'medium',
  showIcon = true,
  showLabel = true,
}: RSVPStatusBadgeProps) {
  const config = RSVP_CONFIG[status];
  const sizeConfig = SIZES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: sizeConfig.padding * 1.5,
          paddingVertical: sizeConfig.padding,
        },
      ]}
    >
      {showIcon && (
        <Ionicons
          name={config.icon}
          size={sizeConfig.iconSize}
          color={config.color}
          style={showLabel ? styles.icon : undefined}
        />
      )}
      {showLabel && (
        <Text style={[styles.label, { color: config.color, fontSize: sizeConfig.fontSize }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

// Compact dot indicator
export function RSVPDot({ status }: { status: RSVPStatus }) {
  const config = RSVP_CONFIG[status];
  return <View style={[styles.dot, { backgroundColor: config.color }]} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
