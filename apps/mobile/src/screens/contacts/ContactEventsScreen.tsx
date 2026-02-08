import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Card, Button, FAB, Chip, ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useContactEvents } from '../../hooks/useEvents';

interface Event {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName?: string;
  status: string;
  budgetTier: string;
  rsvpStatus?: string;
}

export default function ContactEventsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { contactId, contactName } = (route.params as {
    contactId: string;
    contactName: string;
  }) || {};

  const { events, isLoading, refetch } = useContactEvents(contactId);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent' as never, { 
      preSelectedAttendees: [contactId],
      contactName 
    } as never);
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetail' as never, { id: eventId } as never);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#34C759';
      case 'PLANNING':
        return '#FF9500';
      case 'CANCELLED':
        return '#FF3B30';
      case 'COMPLETED':
        return '#8E8E93';
      default:
        return '#5AC8FA';
    }
  };

  const getRSVPColor = (rsvpStatus?: string) => {
    switch (rsvpStatus) {
      case 'ATTENDING':
        return '#34C759';
      case 'MAYBE':
        return '#FF9500';
      case 'DECLINED':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity onPress={() => handleEventPress(item.id)}>
      <Card style={styles.eventCard}>
        <Card.Content>
          <View style={styles.eventHeader}>
            <View style={styles.eventTitleContainer}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
              >
                {item.status}
              </Chip>
            </View>
            {item.rsvpStatus && (
              <Chip
                style={[styles.rsvpChip, { backgroundColor: getRSVPColor(item.rsvpStatus) + '20' }]}
                textStyle={{ color: getRSVPColor(item.rsvpStatus), fontSize: 11 }}
              >
                {item.rsvpStatus === 'ATTENDING' ? '✓ Going' : item.rsvpStatus}
              </Chip>
            )}
          </View>

          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {formatTime(item.startTime)} - {formatTime(item.endTime)}
              </Text>
            </View>
            {item.locationName && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.locationName}
                </Text>
              </View>
            )}
          </View>

          {item.description && (
            <Text style={styles.eventDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptySubtitle}>
        {contactName} isn't part of any events yet.{'\n'}
        Create one to get started!
      </Text>
      <Button
        mode="contained"
        onPress={handleCreateEvent}
        style={styles.createButton}
        icon="plus"
      >
        Create Event with {contactName}
      </Button>
    </View>
  );

  if (isLoading && !events?.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerText}>
          Events with <Text style={styles.headerName}>{contactName}</Text>
        </Text>
        <Text style={styles.eventCount}>
          {events?.length || 0} event{(events?.length || 0) !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* FAB for creating new event */}
      {events && events.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreateEvent}
          color="#fff"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  headerInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 14,
    color: '#666',
  },
  headerName: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  eventCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusChip: {
    height: 24,
  },
  rsvpChip: {
    height: 24,
    marginLeft: 8,
  },
  eventDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  eventDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  createButton: {
    marginTop: 24,
    backgroundColor: '#5856D6',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#5856D6',
  },
});
