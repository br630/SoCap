import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Reminder } from '../../services/dashboardService';

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
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getReminderIcon = (type: string) => {
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {reminder.contact?.profileImage ? (
            <Avatar.Image
              size={40}
              source={{ uri: reminder.contact.profileImage }}
            />
          ) : (
            <Avatar.Text
              size={40}
              label={reminder.contact?.name?.charAt(0).toUpperCase() || '?'}
            />
          )}
          <View style={styles.iconContainer}>
            <Ionicons
              name={getReminderIcon(reminder.type)}
              size={16}
              color="#007AFF"
            />
          </View>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {reminder.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {reminder.contact?.name || reminder.event?.title || 'Reminder'}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text style={styles.timeText}>{formatTime(reminder.scheduledDate)}</Text>
          </View>
        </View>

        {onAction && (
          <Button
            mode="contained"
            compact
            onPress={onAction}
            style={styles.actionButton}
            labelStyle={styles.actionButtonLabel}
          >
            Done
          </Button>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leftSection: {
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
  },
  middleSection: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  actionButton: {
    borderRadius: 8,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
