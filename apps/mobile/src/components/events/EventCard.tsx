import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventStatus } from '../../services/eventService';
import RSVPStatusBadge from './RSVPStatusBadge';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  compact?: boolean;
}

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: '#9E9E9E',
  PLANNING: '#FF9800',
  CONFIRMED: '#4CAF50',
  COMPLETED: '#607D8B',
  CANCELLED: '#F44336',
};

const STATUS_ICONS: Record<EventStatus, keyof typeof Ionicons.glyphMap> = {
  DRAFT: 'document-outline',
  PLANNING: 'time-outline',
  CONFIRMED: 'checkmark-circle',
  COMPLETED: 'checkmark-done',
  CANCELLED: 'close-circle',
};

export default function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const theme = useTheme();

  const eventDate = new Date(event.date);
  const day = eventDate.getDate();
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' });
  const year = eventDate.getFullYear();
  const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'short' });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const statusColor = STATUS_COLORS[event.status];
  const statusIcon = STATUS_ICONS[event.status];

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactCard}>
          <View style={[styles.compactDateIndicator, { backgroundColor: statusColor }]} />
          <View style={styles.compactContent}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={styles.compactTime}>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </Text>
          </View>
          {event.attendeeCount !== undefined && event.attendeeCount > 0 && (
            <View style={styles.compactAttendees}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.compactAttendeesText}>{event.attendeeCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.content}>
          {/* Date Column */}
          <View style={styles.dateColumn}>
            <Text style={styles.dateDay}>{day}</Text>
            <Text style={styles.dateMonth}>{month}</Text>
            <Text style={styles.dateWeekday}>{weekday}</Text>
          </View>

          {/* Event Info */}
          <View style={styles.infoColumn}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {event.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Ionicons name={statusIcon} size={10} color="#fff" />
                <Text style={styles.statusText}>{event.status}</Text>
              </View>
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.detailText}>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </Text>
              </View>

              {event.locationName && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {event.locationName}
                  </Text>
                </View>
              )}

              <View style={styles.bottomRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{event.eventType}</Text>
                </View>

                {event.attendeeCount !== undefined && event.attendeeCount > 0 && (
                  <View style={styles.attendeesInfo}>
                    <Ionicons name="people" size={14} color="#666" />
                    <Text style={styles.attendeesText}>
                      {event.attendeeCount} {event.attendeeCount === 1 ? 'guest' : 'guests'}
                    </Text>
                  </View>
                )}

                {event.estimatedCost > 0 && (
                  <View style={styles.costInfo}>
                    <Ionicons name="wallet-outline" size={14} color="#666" />
                    <Text style={styles.costText}>${event.estimatedCost}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
    backgroundColor: '#fff',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  dateColumn: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    lineHeight: 32,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  dateWeekday: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  infoColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  typeBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    textTransform: 'capitalize',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontSize: 12,
    color: '#666',
  },
  costInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
  },
  compactDateIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  compactTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  compactAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  compactAttendeesText: {
    fontSize: 12,
    color: '#666',
  },
});
