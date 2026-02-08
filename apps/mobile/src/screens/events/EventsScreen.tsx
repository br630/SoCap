import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import eventService, { Event, EventStatus } from '../../services/eventService';

const EVENT_STATUSES: { value: EventStatus; label: string; color: string; icon: string }[] = [
  { value: 'DRAFT', label: 'Draft', color: '#8E8E93', icon: 'document-outline' },
  { value: 'PLANNING', label: 'Planning', color: '#FF9500', icon: 'time-outline' },
  { value: 'CONFIRMED', label: 'Confirmed', color: '#34C759', icon: 'checkmark-circle' },
  { value: 'COMPLETED', label: 'Completed', color: '#8E8E93', icon: 'checkmark-done' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#FF3B30', icon: 'close-circle' },
];

export default function EventsScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 16 }}
          onPress={() => navigation.navigate('AddEditEvent' as never)}
        >
          <Ionicons name="add-circle" size={28} color="#5856D6" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEvents(
        {
          dateFrom: new Date().toISOString(),
        },
        1,
        50
      );
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    // Assuming timeString is in HH:mm format
    return timeString;
  };

  const handleStatusPress = (event: Event) => {
    setSelectedEvent(event);
    setStatusModalVisible(true);
  };

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!selectedEvent) return;
    
    try {
      await eventService.updateEvent(selectedEvent.id, { status: newStatus });
      // Update local state
      setEvents(events.map(e => 
        e.id === selectedEvent.id ? { ...e, status: newStatus } : e
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setStatusModalVisible(false);
      setSelectedEvent(null);
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetail' as never, { id: item.id } as never)}
    >
      <View style={styles.eventHeader}>
        <View style={styles.eventDate}>
          <Text style={styles.eventDay}>
            {new Date(item.date).getDate()}
          </Text>
          <Text style={styles.eventMonth}>
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventType}>{item.eventType}</Text>
          <Text style={styles.eventTime}>
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
          {item.locationName && (
            <Text style={styles.eventLocation}>📍 {item.locationName}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
          onPress={(e) => {
            e.stopPropagation();
            handleStatusPress(item);
          }}
        >
          <Text style={styles.statusText}>{item.status}</Text>
          <Ionicons name="chevron-down" size={10} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#34C759';
      case 'PLANNING':
        return '#FF9500';
      case 'COMPLETED':
        return '#8E8E93';
      case 'CANCELLED':
        return '#FF3B30';
      default:
        return '#5AC8FA';
    }
  };

  if (loading && events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No upcoming events</Text>
          <Text style={styles.emptySubtext}>
            Create your first event to get started
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('AddEditEvent' as never)}
          >
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadEvents}
        />
      )}

      {/* Status Change Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Event Status</Text>
            <Text style={styles.modalSubtitle}>{selectedEvent?.title}</Text>
            
            {EVENT_STATUSES.map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusOption,
                  selectedEvent?.status === status.value && styles.statusOptionSelected,
                ]}
                onPress={() => handleStatusChange(status.value)}
              >
                <Ionicons name={status.icon as any} size={20} color={status.color} />
                <Text style={[styles.statusOptionText, { color: status.color }]}>
                  {status.label}
                </Text>
                {selectedEvent?.status === status.value && (
                  <Ionicons name="checkmark" size={20} color={status.color} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.modalDivider} />
            
            <Text style={styles.autoConfirmNote}>
              💡 Events auto-confirm when all invitees RSVP "Confirmed"
            </Text>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 15,
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventDate: {
    width: 60,
    alignItems: 'center',
    marginRight: 15,
  },
  eventDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  eventMonth: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  createButton: {
    marginTop: 20,
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  statusOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  autoConfirmNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalCancel: {
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
