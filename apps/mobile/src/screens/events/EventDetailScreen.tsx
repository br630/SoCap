import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Share,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Divider,
  List,
  Portal,
  Dialog,
  ActivityIndicator,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent, useEventMutations } from '../../hooks/useEvents';
import {
  BudgetProgressBar,
  AttendeeAvatar,
  RSVPStatusBadge,
} from '../../components/events';
import eventService, { EventAttendee, EventStatus } from '../../services/eventService';

const STATUS_CONFIG: Record<EventStatus, { color: string; icon: string; label: string }> = {
  DRAFT: { color: '#9E9E9E', icon: 'document-outline', label: 'Draft' },
  PLANNING: { color: '#FF9800', icon: 'time-outline', label: 'Planning' },
  CONFIRMED: { color: '#4CAF50', icon: 'checkmark-circle', label: 'Confirmed' },
  COMPLETED: { color: '#607D8B', icon: 'checkmark-done', label: 'Completed' },
  CANCELLED: { color: '#F44336', icon: 'close-circle', label: 'Cancelled' },
};

const ALL_STATUSES: { value: EventStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = (route.params as { id: string }) || {};

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const { event, isLoading, isError, refetch } = useEvent(id);
  const { cancelEvent, isCancelling, removeAttendee, isRemovingAttendee, updateEvent, isUpdating } = useEventMutations();

  const handleEdit = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('CreateEvent' as never, { eventId: id, mode: 'edit' } as never);
  }, [navigation, id]);

  const handleStatusChange = useCallback(async (newStatus: EventStatus) => {
    try {
      await updateEvent({ id, data: { status: newStatus } });
      setStatusModalVisible(false);
      refetch();
      Alert.alert('Success', `Event status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update event status');
    }
  }, [updateEvent, id, refetch]);

  const handleSendRSVPReminders = useCallback(async () => {
    setSendingReminders(true);
    try {
      const response = await eventService.sendRSVPReminders(id);
      Alert.alert(
        'Reminders Sent',
        `Sent ${response.reminderCount} reminder(s) to pending attendees.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send RSVP reminders');
    } finally {
      setSendingReminders(false);
    }
  }, [id]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelEvent(id);
      setShowCancelDialog(false);
      Alert.alert('Event Cancelled', 'The event has been cancelled and attendees notified.');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel event');
    }
  }, [cancelEvent, id]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    setMenuVisible(false);

    try {
      const message = `🎉 ${event.title}\n\n📅 ${new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}\n⏰ ${event.startTime} - ${event.endTime}${
        event.locationName ? `\n📍 ${event.locationName}` : ''
      }\n\n${event.description || ''}`;

      await Share.share({ message });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [event]);

  const handleAddAttendees = useCallback(() => {
    navigation.navigate('SelectAttendees' as never, { eventId: id } as never);
  }, [navigation, id]);

  const handleRemoveAttendee = useCallback(
    (attendee: EventAttendee) => {
      Alert.alert(
        'Remove Attendee',
        `Are you sure you want to remove ${attendee.contact?.name || 'this attendee'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeAttendee({ eventId: id, attendeeId: attendee.id }),
          },
        ]
      );
    },
    [removeAttendee, id]
  );

  const handleOpenMap = useCallback(() => {
    if (!event?.locationLat || !event?.locationLng) return;
    const url = `https://maps.google.com/?q=${event.locationLat},${event.locationLng}`;
    Linking.openURL(url);
  }, [event]);

  const handleViewSavingsGoal = useCallback(() => {
    if (!event?.linkedSavingsGoalId) return;
    navigation.navigate('SavingsGoal' as never, { id: event.linkedSavingsGoalId } as never);
  }, [navigation, event?.linkedSavingsGoalId]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Event not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.PLANNING;
  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();
  const isCancelled = event.status === 'CANCELLED';

  // RSVP counts
  const rsvpCounts = {
    confirmed: event.attendees?.filter((a) => a.rsvpStatus === 'CONFIRMED').length || 0,
    pending: event.attendees?.filter((a) => a.rsvpStatus === 'PENDING').length || 0,
    declined: event.attendees?.filter((a) => a.rsvpStatus === 'DECLINED').length || 0,
    maybe: event.attendees?.filter((a) => a.rsvpStatus === 'MAYBE').length || 0,
  };
  const totalGuests =
    rsvpCounts.confirmed +
    (event.attendees?.reduce((sum, a) => (a.rsvpStatus === 'CONFIRMED' ? sum + a.plusOnes : sum), 0) || 0);

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            {/* Status Badge - Clickable */}
            <TouchableOpacity 
              style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}
              onPress={() => setStatusModalVisible(true)}
            >
              <Ionicons name={statusConfig.icon as any} size={14} color="#fff" />
              <Text style={styles.statusText}>{statusConfig.label}</Text>
              <Ionicons name="chevron-down" size={12} color="#fff" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>{event.title}</Text>

            {/* Date & Time */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
                <Text style={styles.dateMonth}>
                  {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
                <Text style={styles.dateYear}>{eventDate.getFullYear()}</Text>
              </View>
              <View style={styles.timeInfo}>
                <Text style={styles.weekday}>
                  {eventDate.toLocaleDateString('en-US', { weekday: 'long' })}
                </Text>
                <Text style={styles.timeRange}>
                  {event.startTime} - {event.endTime}
                </Text>
                <Text style={styles.eventType}>{event.eventType}</Text>
              </View>

              {/* Actions Menu */}
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible(true)}
                  />
                }
              >
                {!isPastEvent && !isCancelled && (
                  <Menu.Item onPress={handleEdit} title="Edit" leadingIcon="pencil" />
                )}
                <Menu.Item onPress={handleShare} title="Share" leadingIcon="share" />
                {!isPastEvent && !isCancelled && (
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(false);
                      setShowCancelDialog(true);
                    }}
                    title="Cancel Event"
                    leadingIcon="close-circle"
                    titleStyle={{ color: '#F44336' }}
                  />
                )}
              </Menu>
            </View>

            {/* Description */}
            {event.description && (
              <Text style={styles.description}>{event.description}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Location Card */}
        {(event.locationName || event.locationAddress) && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Location</Text>
              </View>

              <TouchableOpacity
                onPress={handleOpenMap}
                disabled={!event.locationLat || !event.locationLng}
              >
                {/* Static Map Image */}
                {event.locationLat && event.locationLng && (
                  <Image
                    source={{
                      uri: `https://maps.googleapis.com/maps/api/staticmap?center=${event.locationLat},${event.locationLng}&zoom=15&size=600x200&markers=color:red%7C${event.locationLat},${event.locationLng}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || ''}`,
                    }}
                    style={styles.mapPreview}
                    resizeMode="cover"
                  />
                )}

                <View style={styles.locationDetails}>
                  <Text style={styles.locationName}>{event.locationName}</Text>
                  {event.locationAddress && (
                    <Text style={styles.locationAddress}>{event.locationAddress}</Text>
                  )}
                  {event.locationLat && event.locationLng && (
                    <Text style={styles.openMapText}>Tap to open in Maps →</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {/* Budget Card */}
        {event.budgetTier && (
          <Card style={styles.card}>
            <Card.Content>
              <BudgetProgressBar
                estimatedCost={event.estimatedCost || 0}
                actualCost={event.actualCost}
                budgetTier={event.budgetTier}
              />

            {/* Linked Savings Goal */}
            {event.linkedSavingsGoalId && event.savingsGoals && event.savingsGoals.length > 0 && (
              <TouchableOpacity style={styles.savingsGoalLink} onPress={handleViewSavingsGoal}>
                <Ionicons name="wallet" size={18} color="#007AFF" />
                <View style={styles.savingsGoalInfo}>
                  <Text style={styles.savingsGoalName}>{event.savingsGoals[0].name}</Text>
                  <Text style={styles.savingsGoalProgress}>
                    ${event.savingsGoals[0].currentAmount} / ${event.savingsGoals[0].targetAmount}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>
        )}

        {/* Attendees Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>
                Attendees ({event.attendees?.length || 0})
              </Text>
              {!isPastEvent && !isCancelled && (
                <Button mode="text" compact onPress={handleAddAttendees}>
                  Add
                </Button>
              )}
            </View>

            {/* RSVP Summary */}
            <View style={styles.rsvpSummary}>
              <View style={styles.rsvpItem}>
                <Text style={styles.rsvpCount}>{rsvpCounts.confirmed}</Text>
                <Text style={styles.rsvpLabel}>Confirmed</Text>
              </View>
              <View style={styles.rsvpItem}>
                <Text style={styles.rsvpCount}>{rsvpCounts.pending}</Text>
                <Text style={styles.rsvpLabel}>Pending</Text>
              </View>
              <View style={styles.rsvpItem}>
                <Text style={styles.rsvpCount}>{rsvpCounts.maybe}</Text>
                <Text style={styles.rsvpLabel}>Maybe</Text>
              </View>
              <View style={styles.rsvpItem}>
                <Text style={styles.rsvpCount}>{rsvpCounts.declined}</Text>
                <Text style={styles.rsvpLabel}>Declined</Text>
              </View>
            </View>

            {totalGuests > 0 && (
              <Text style={styles.totalGuests}>
                Total expected: {totalGuests} guest{totalGuests !== 1 ? 's' : ''} (including +1s)
              </Text>
            )}

            {/* Send RSVP Reminders button */}
            {rsvpCounts.pending > 0 && !isPastEvent && !isCancelled && (
              <TouchableOpacity
                style={styles.sendRemindersButton}
                onPress={handleSendRSVPReminders}
                disabled={sendingReminders}
              >
                <Ionicons name="notifications-outline" size={18} color="#FF9800" />
                <Text style={styles.sendRemindersText}>
                  {sendingReminders ? 'Sending...' : `Send RSVP Reminders (${rsvpCounts.pending} pending)`}
                </Text>
              </TouchableOpacity>
            )}

            <Divider style={styles.divider} />

            {/* Attendee List */}
            {!event.attendees || event.attendees.length === 0 ? (
              <View style={styles.emptyAttendees}>
                <Text style={styles.emptyText}>No attendees yet</Text>
                {!isPastEvent && !isCancelled && (
                  <Button mode="outlined" onPress={handleAddAttendees} style={styles.addButton}>
                    Add Attendees
                  </Button>
                )}
              </View>
            ) : (
              event.attendees.map((attendee) => (
                <View key={attendee.id} style={styles.attendeeRow}>
                  <AttendeeAvatar
                    name={attendee.contact?.name || 'Guest'}
                    profileImage={attendee.contact?.profileImage}
                    rsvpStatus={attendee.rsvpStatus}
                  />
                  <View style={styles.attendeeInfo}>
                    <Text style={styles.attendeeName}>{attendee.contact?.name || 'Guest'}</Text>
                    <View style={styles.attendeeMeta}>
                      <RSVPStatusBadge status={attendee.rsvpStatus} size="small" />
                      {attendee.plusOnes > 0 && (
                        <Text style={styles.plusOnes}>+{attendee.plusOnes}</Text>
                      )}
                    </View>
                    {attendee.dietaryRestrictions && (
                      <Text style={styles.dietary}>🍽️ {attendee.dietaryRestrictions}</Text>
                    )}
                  </View>
                  {!isPastEvent && !isCancelled && (
                    <IconButton
                      icon="close"
                      size={18}
                      onPress={() => handleRemoveAttendee(attendee)}
                    />
                  )}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog visible={showCancelDialog} onDismiss={() => setShowCancelDialog(false)}>
          <Dialog.Title>Cancel Event?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to cancel "{event.title}"? All attendees will be notified.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)}>Keep Event</Button>
            <Button
              onPress={handleCancel}
              loading={isCancelling}
              textColor="#F44336"
            >
              Cancel Event
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
            <Text style={styles.modalSubtitle}>{event.title}</Text>
            
            {ALL_STATUSES.map((status) => {
              const config = STATUS_CONFIG[status.value];
              return (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    event.status === status.value && styles.statusOptionSelected,
                  ]}
                  onPress={() => handleStatusChange(status.value)}
                  disabled={isUpdating}
                >
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                  <Text style={[styles.statusOptionText, { color: config.color }]}>
                    {status.label}
                  </Text>
                  {event.status === status.value && (
                    <Ionicons name="checkmark" size={20} color={config.color} />
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalDivider} />
            
            <Text style={styles.autoConfirmNote}>
              💡 Events auto-confirm when all invitees RSVP "Confirmed"
            </Text>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Close</Text>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.6,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 64,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  dateYear: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  timeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  weekday: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timeRange: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  eventType: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  mapPreview: {
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  locationDetails: {
    gap: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
  },
  openMapText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  savingsGoalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 12,
  },
  savingsGoalInfo: {
    flex: 1,
  },
  savingsGoalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  savingsGoalProgress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rsvpSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  rsvpItem: {
    alignItems: 'center',
  },
  rsvpCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  rsvpLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  totalGuests: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  emptyAttendees: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  addButton: {
    marginTop: 8,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attendeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  attendeeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  plusOnes: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dietary: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
  sendRemindersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  sendRemindersText: {
    color: '#FF9800',
    fontWeight: '600',
    fontSize: 14,
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
