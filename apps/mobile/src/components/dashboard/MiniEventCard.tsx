import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../services/dashboardService';

interface MiniEventCardProps {
  event: Event;
  onPress?: () => void;
}

export default function MiniEventCard({ event, onPress }: MiniEventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const attendeeCount = event.attendees?.length || 0;
  const attendeeAvatars = event.attendees?.slice(0, 3) || [];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatDate(event.date)}</Text>
          <Text style={styles.timeText}>{formatTime(event.startTime)}</Text>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          {event.locationName && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>
                {event.locationName}
              </Text>
            </View>
          )}
          {attendeeCount > 0 && (
            <View style={styles.attendeesRow}>
              <View style={styles.avatarsContainer}>
                {attendeeAvatars.map((attendee, index) => (
                  <View
                    key={attendee.contact.id}
                    style={[styles.avatarWrapper, { zIndex: 10 - index }]}
                  >
                    {attendee.contact.profileImage ? (
                      <Avatar.Image
                        size={20}
                        source={{ uri: attendee.contact.profileImage }}
                      />
                    ) : (
                      <Avatar.Text
                        size={20}
                        label={attendee.contact.name.charAt(0).toUpperCase()}
                      />
                    )}
                  </View>
                ))}
                {attendeeCount > 3 && (
                  <View style={styles.moreAvatars}>
                    <Text style={styles.moreText}>+{attendeeCount - 3}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.attendeeCount}>
                {attendeeCount} {attendeeCount === 1 ? 'guest' : 'guests'}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
  dateSection: {
    alignItems: 'center',
    minWidth: 60,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#666',
  },
  middleSection: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
  },
  moreAvatars: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
  },
  attendeeCount: {
    fontSize: 12,
    color: '#666',
  },
});
