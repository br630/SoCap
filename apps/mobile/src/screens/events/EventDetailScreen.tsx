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
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Divider,
  Portal,
  Dialog,
  ActivityIndicator,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent, useEventMutations } from '../../hooks/useEvents';
import {
  BudgetProgressBar,
  AttendeeAvatar,
  RSVPStatusBadge,
} from '../../components/events';
import eventService, { EventAttendee, EventStatus } from '../../services/eventService';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

// Design System status colors
const STATUS_CONFIG: Record<EventStatus, { color: string; icon: string; label: string }> = {
  DRAFT: { color: colors.statusDraft, icon: 'document-outline', label: 'Draft' },
  PLANNING: { color: colors.statusPlanning, icon: 'time-outline', label: 'Planning' },
  CONFIRMED: { color: colors.statusConfirmed, icon: 'checkmark-circle', label: 'Confirmed' },
  COMPLETED: { color: colors.statusCompleted, icon: 'checkmark-done', label: 'Completed' },
  CANCELLED: { color: colors.statusCancelled, icon: 'close-circle', label: 'Cancelled' },
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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { event, isLoading, isError, refetch } = useEvent(id);
  const { cancelEvent, isCancelling, deleteEvent, isDeleting, removeAttendee, isRemovingAttendee, updateEvent, isUpdating } = useEventMutations();

  // Refetch event data when screen regains focus (e.g. after adding attendees)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

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
      Alert.alert('Reminders Sent', `Sent ${response.reminderCount} reminder(s) to pending attendees.`);
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
      refetch();
      if (Platform.OS === 'web') {
        window.alert('Event cancelled. Attendees have been notified via email.');
      } else {
        Alert.alert('Event Cancelled', 'The event has been cancelled and attendees notified via email.');
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to cancel event');
      } else {
        Alert.alert('Error', 'Failed to cancel event');
      }
    }
  }, [cancelEvent, id, refetch]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteEvent(id);
      setShowDeleteDialog(false);
      navigation.goBack();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to delete event');
      } else {
        Alert.alert('Error', 'Failed to delete event');
      }
    }
  }, [deleteEvent, id, navigation]);

  const handleShare = useCallback(async () => {
    if (!event) return;
    setMenuVisible(false);
    try {
      const message = `${event.title}\n\n${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n${event.startTime} - ${event.endTime}${event.locationName ? `\n${event.locationName}` : ''}\n\n${event.description || ''}`;
      await Share.share({ message });
    } catch (error) { console.error('Share error:', error); }
  }, [event]);

  const handleAddAttendees = useCallback(() => {
    navigation.navigate('SelectAttendees' as never, { eventId: id } as never);
  }, [navigation, id]);

  const handleRemoveAttendee = useCallback(
    (attendee: EventAttendee) => {
      Alert.alert('Remove Attendee', `Are you sure you want to remove ${attendee.contact?.name || 'this attendee'}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeAttendee({ eventId: id, attendeeId: attendee.id }) },
      ]);
    },
    [removeAttendee, id]
  );

  const handleOpenMap = useCallback(() => {
    if (!event?.locationLat || !event?.locationLng) return;
    Linking.openURL(`https://maps.google.com/?q=${event.locationLat},${event.locationLng}`);
  }, [event]);

  const handleViewSavingsGoal = useCallback(() => {
    if (!event?.linkedSavingsGoalId) return;
    navigation.navigate('SavingsGoal' as never, { id: event.linkedSavingsGoalId } as never);
  }, [navigation, event?.linkedSavingsGoalId]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>Event not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} buttonColor={colors.primary}>Go Back</Button>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.PLANNING;
  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();
  const isCancelled = event.status === 'CANCELLED';

  const rsvpCounts = {
    confirmed: event.attendees?.filter((a) => a.rsvpStatus === 'CONFIRMED').length || 0,
    pending: event.attendees?.filter((a) => a.rsvpStatus === 'PENDING').length || 0,
    declined: event.attendees?.filter((a) => a.rsvpStatus === 'DECLINED').length || 0,
    maybe: event.attendees?.filter((a) => a.rsvpStatus === 'MAYBE').length || 0,
  };
  const totalGuests = rsvpCounts.confirmed + (event.attendees?.reduce((sum, a) => (a.rsvpStatus === 'CONFIRMED' ? sum + a.plusOnes : sum), 0) || 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card — Elevated Card */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}
            onPress={() => setStatusModalVisible(true)}
          >
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            <Ionicons name="chevron-down" size={12} color={statusConfig.color} />
          </TouchableOpacity>

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
              <Text style={styles.dateMonth}>{eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
            </View>
            <View style={styles.timeInfo}>
              <Text style={styles.weekday}>{eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              <Text style={styles.timeRange}>{event.startTime} - {event.endTime}</Text>
              <Text style={styles.eventType}>{event.eventType}</Text>
            </View>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} iconColor={colors.textSecondary} />}
            >
              {!isPastEvent && !isCancelled && <Menu.Item onPress={handleEdit} title="Edit" leadingIcon="pencil" />}
              <Menu.Item onPress={handleShare} title="Share" leadingIcon="share" />
              {!isPastEvent && !isCancelled && (
                <Menu.Item onPress={() => { setMenuVisible(false); setShowCancelDialog(true); }} title="Cancel Event" leadingIcon="close-circle" titleStyle={{ color: colors.error }} />
              )}
            </Menu>
          </View>

          {event.description && <Text style={styles.description}>{event.description}</Text>}
        </View>

        {/* Location Card */}
        {(event.locationName || event.locationAddress) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Location</Text>
            <TouchableOpacity onPress={handleOpenMap} disabled={!event.locationLat || !event.locationLng}>
              {event.locationLat && event.locationLng && (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="location" size={32} color={colors.textSecondary} />
                </View>
              )}
              <Text style={styles.locationName}>{event.locationName}</Text>
              {event.locationAddress && <Text style={styles.locationAddress}>{event.locationAddress}</Text>}
              {event.locationLat && event.locationLng && (
                <Text style={styles.openMapText}>Open in Maps</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Budget Card */}
        {event.budgetTier && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Budget</Text>
            <BudgetProgressBar
              estimatedCost={event.estimatedCost || 0}
              actualCost={event.actualCost}
              budgetTier={event.budgetTier}
            />
            {rsvpCounts.pending > 0 && !isPastEvent && !isCancelled && (
              <TouchableOpacity style={styles.sendRemindersButton} onPress={handleSendRSVPReminders} disabled={sendingReminders}>
                <Text style={styles.sendRemindersText}>
                  {sendingReminders ? 'Sending...' : 'Send RSVP Reminders'}
                </Text>
              </TouchableOpacity>
            )}
            {event.linkedSavingsGoalId && event.savingsGoals && event.savingsGoals.length > 0 && (
              <TouchableOpacity style={styles.savingsGoalLink} onPress={handleViewSavingsGoal}>
                <Ionicons name="wallet" size={20} color={colors.primary} />
                <View style={styles.savingsGoalInfo}>
                  <Text style={styles.savingsGoalName}>{event.savingsGoals[0].name}</Text>
                  <Text style={styles.savingsGoalProgress}>${event.savingsGoals[0].currentAmount} / ${event.savingsGoals[0].targetAmount}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Attendees Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Attendees ({event.attendees?.length || 0})</Text>
            {!isPastEvent && !isCancelled && (
              <Button mode="text" compact onPress={handleAddAttendees} textColor={colors.primary}>Add</Button>
            )}
          </View>

          {/* RSVP Summary */}
          {event.attendees && event.attendees.length > 0 && (
            <View style={styles.rsvpSummary}>
              {rsvpCounts.confirmed > 0 && (
                <View style={[styles.rsvpChip, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={[styles.rsvpChipText, { color: '#16a34a' }]}>{rsvpCounts.confirmed} Confirmed</Text>
                </View>
              )}
              {rsvpCounts.pending > 0 && (
                <View style={[styles.rsvpChip, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="time" size={14} color="#d97706" />
                  <Text style={[styles.rsvpChipText, { color: '#d97706' }]}>{rsvpCounts.pending} Pending</Text>
                </View>
              )}
              {rsvpCounts.declined > 0 && (
                <View style={[styles.rsvpChip, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="close-circle" size={14} color="#dc2626" />
                  <Text style={[styles.rsvpChipText, { color: '#dc2626' }]}>{rsvpCounts.declined} Declined</Text>
                </View>
              )}
              {rsvpCounts.maybe > 0 && (
                <View style={[styles.rsvpChip, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="help-circle" size={14} color="#4f46e5" />
                  <Text style={[styles.rsvpChipText, { color: '#4f46e5' }]}>{rsvpCounts.maybe} Maybe</Text>
                </View>
              )}
            </View>
          )}

          {event.attendees && event.attendees.length > 0 ? (
            <View style={styles.attendeeList}>
              {event.attendees.map((attendee) => {
                const initials = (attendee.contact?.name || 'G')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const rsvp = attendee.rsvpStatus || 'PENDING';
                const rsvpConfig: Record<string, { bg: string; color: string; icon: string; label: string }> = {
                  CONFIRMED: { bg: '#dcfce7', color: '#16a34a', icon: 'checkmark-circle', label: 'Confirmed' },
                  PENDING: { bg: '#fef3c7', color: '#d97706', icon: 'time', label: 'Pending' },
                  DECLINED: { bg: '#fee2e2', color: '#dc2626', icon: 'close-circle', label: 'Declined' },
                  MAYBE: { bg: '#e0e7ff', color: '#4f46e5', icon: 'help-circle', label: 'Maybe' },
                };
                const cfg = rsvpConfig[rsvp] || rsvpConfig.PENDING;

                return (
                  <View key={attendee.id} style={styles.attendeeRow}>
                    <View style={styles.attendeeAvatarContainer}>
                      {attendee.contact?.profileImage ? (
                        <Image source={{ uri: attendee.contact.profileImage }} style={styles.attendeeAvatar} />
                      ) : (
                        <View style={styles.attendeeAvatarFallback}>
                          <Text style={styles.attendeeAvatarText}>{initials}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>{attendee.contact?.name || 'Guest'}</Text>
                      {attendee.contact?.email && (
                        <Text style={styles.attendeeEmail} numberOfLines={1}>{attendee.contact.email}</Text>
                      )}
                    </View>
                    <View style={[styles.rsvpBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                      <Text style={[styles.rsvpBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyAttendees}>
              <Text style={styles.emptyText}>No attendees yet</Text>
              {!isPastEvent && !isCancelled && (
                <Button mode="outlined" onPress={handleAddAttendees} style={styles.addButton}>Add Attendees</Button>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {!isPastEvent && !isCancelled && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editEventButton} onPress={handleEdit} activeOpacity={0.8}>
              <Text style={styles.editEventButtonText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelEventButton}
              onPress={() => setShowCancelDialog(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={styles.cancelEventButtonText}>Cancel Event</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delete permanently — available for cancelled events */}
        {isCancelled && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.deleteEventButton}
              onPress={() => {
                if (Platform.OS === 'web') {
                  setShowDeleteDialog(true);
                } else {
                  Alert.alert(
                    'Delete Event',
                    'Are you sure you want to permanently delete this event? This cannot be undone.',
                    [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: handleDelete },
                    ]
                  );
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deleteEventButtonText}>Delete Permanently</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Cancel Dialog */}
      <Portal>
        <Dialog visible={showCancelDialog} onDismiss={() => setShowCancelDialog(false)}>
          <Dialog.Title>Cancel Event?</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to cancel "{event.title}"?</Text>
            <Text style={{ marginTop: spacing.sm, color: colors.textSecondary }}>
              All attendees will be notified via email that the event has been cancelled.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)}>Keep Event</Button>
            <Button onPress={handleCancel} loading={isCancelling} textColor={colors.error}>Cancel Event</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Event?</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to permanently delete "{event.title}"? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Keep</Button>
            <Button onPress={handleDelete} loading={isDeleting} textColor={colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Event Status</Text>
            <Text style={styles.modalSubtitle}>{event.title}</Text>
            {ALL_STATUSES.map((status) => {
              const config = STATUS_CONFIG[status.value];
              return (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.statusOption, event.status === status.value && styles.statusOptionSelected]}
                  onPress={() => handleStatusChange(status.value)}
                  disabled={isUpdating}
                >
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                  <Text style={[styles.statusOptionText, { color: config.color }]}>{status.label}</Text>
                  {event.status === status.value && <Ionicons name="checkmark" size={20} color={config.color} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setStatusModalVisible(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.background },
  loadingText: { marginTop: spacing.md, ...typography.bodySmall, color: colors.textSecondary },
  errorText: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.lg },
  // Elevated Card
  headerCard: {
    backgroundColor: '#FFFFFF',
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.medium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statusText: { ...typography.caption, fontWeight: '600' },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center' },
  dateBox: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 64,
  },
  dateDay: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  dateMonth: { ...typography.overline, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  timeInfo: { flex: 1, marginLeft: spacing.lg },
  weekday: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  timeRange: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  eventType: { ...typography.captionSmall, color: colors.textSecondary, marginTop: spacing.xs, textTransform: 'capitalize' },
  description: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.lg },
  // Standard Card
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.light,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  cardTitle: { ...typography.h5, color: colors.textPrimary, marginBottom: spacing.md },
  mapPlaceholder: {
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  locationAddress: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  openMapText: { ...typography.caption, color: colors.primary, marginTop: spacing.sm, fontWeight: '600' },
  sendRemindersButton: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.md },
  sendRemindersText: { color: colors.primary, fontWeight: '600', ...typography.bodySmall },
  savingsGoalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  savingsGoalInfo: { flex: 1 },
  savingsGoalName: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  savingsGoalProgress: { ...typography.captionSmall, color: colors.textSecondary, marginTop: 2 },
  // RSVP Summary
  rsvpSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  rsvpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  rsvpChipText: { fontSize: 12, fontWeight: '600' },
  // Attendee List
  attendeeList: { gap: 2 },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  attendeeAvatarContainer: { marginRight: spacing.md },
  attendeeAvatar: { width: 40, height: 40, borderRadius: 20 },
  attendeeAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeAvatarText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  attendeeInfo: { flex: 1 },
  attendeeName: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  attendeeEmail: { ...typography.captionSmall, color: colors.textSecondary, marginTop: 1 },
  rsvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  rsvpBadgeText: { fontSize: 12, fontWeight: '600' },
  emptyAttendees: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
  addButton: { marginTop: spacing.sm },
  // Action Buttons
  actionButtons: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  editEventButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.light,
  },
  editEventButtonText: { color: '#FFFFFF', ...typography.h5 },
  cancelEventButton: {
    flexDirection: 'row',
    backgroundColor: colors.error + '12',
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  cancelEventButtonText: { color: colors.error, ...typography.h5 },
  deleteEventButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.light,
  },
  deleteEventButtonText: { color: '#FFFFFF', ...typography.h5 },
  bottomSpacer: { height: spacing['3xl'] },
  // Modal — Strong shadow
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: radii.xl, padding: spacing.xl, width: '85%', maxWidth: 400, ...shadows.strong },
  modalTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xl },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  statusOptionSelected: { backgroundColor: colors.primary + '15' },
  statusOptionText: { flex: 1, ...typography.body, fontWeight: '600' },
  modalCancel: { padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  modalCancelText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
});
