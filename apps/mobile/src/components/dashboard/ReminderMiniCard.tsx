import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Reminder } from '../../services/dashboardService';
import { colors, shadows, radii, spacing } from '../../theme/paperTheme';

interface ReminderMiniCardProps {
  reminder: Reminder;
  onPress?: () => void;
  onAction?: () => void;
}

export default function ReminderMiniCard({
  reminder,
  onPress,
  onAction,
}: ReminderMiniCardProps) {
  const getReminderIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'BIRTHDAY':
        return 'gift-outline';
      case 'ANNIVERSARY':
        return 'heart-outline';
      case 'REACH_OUT':
        return 'chatbubble-outline';
      case 'EVENT':
        return 'calendar-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getReminderColor = (type: string): string => {
    switch (type) {
      case 'BIRTHDAY':
        return colors.secondary;
      case 'ANNIVERSARY':
        return colors.error;
      case 'REACH_OUT':
        return colors.primary;
      case 'EVENT':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const iconColor = getReminderColor(reminder.type);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={getReminderIcon(reminder.type)} size={18} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{reminder.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {reminder.contact?.name || reminder.event?.title || 'Reminder'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    minWidth: 180,
    ...shadows.light,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
