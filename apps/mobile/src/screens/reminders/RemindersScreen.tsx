import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  IconButton,
  Menu,
  Divider,
  ActivityIndicator,
  Button,
  Portal,
  Dialog,
  RadioButton,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../../config/api';
import { format, formatDistanceToNow } from 'date-fns';

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string;
  scheduledDate: string;
  status: string;
  contact?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  event?: {
    id: string;
    title: string;
    startDate: string;
  };
  createdAt: string;
}

type FilterType = 'ALL' | 'REACH_OUT' | 'BIRTHDAY' | 'EVENT' | 'SAVINGS' | 'CUSTOM';
type StatusFilter = 'ALL' | 'PENDING' | 'SENT' | 'COMPLETED' | 'DISMISSED';

const SNOOZE_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '3 hours', value: 180 },
  { label: 'Tomorrow', value: 1440 },
  { label: '1 week', value: 10080 },
];

export default function RemindersScreen() {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [snoozeDialogVisible, setSnoozeDialogVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<string | null>(null);
  const [selectedSnoozeDuration, setSelectedSnoozeDuration] = useState(60);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const params: any = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const response = await apiClient.get('/reminders', { params });
      setReminders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const handleDismiss = async (id: string) => {
    try {
      await apiClient.post(`/reminders/${id}/dismiss`);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to dismiss reminder:', error);
      Alert.alert('Error', 'Failed to dismiss reminder');
    }
    setMenuVisible(null);
  };

  const handleSnooze = async () => {
    if (!selectedReminder) return;
    
    try {
      await apiClient.post(`/reminders/${selectedReminder}/snooze`, {
        duration: selectedSnoozeDuration,
      });
      fetchReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder');
    }
    setSnoozeDialogVisible(false);
    setSelectedReminder(null);
  };

  const handleMarkActedOn = async (id: string) => {
    try {
      await apiClient.post(`/reminders/${id}/acted`);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to mark reminder as acted on:', error);
      Alert.alert('Error', 'Failed to update reminder');
    }
    setMenuVisible(null);
  };

  const handleTakeAction = (reminder: Reminder) => {
    setMenuVisible(null);
    
    if (reminder.contact?.id) {
      navigation.navigate('ContactDetail' as never, { id: reminder.contact.id } as never);
    } else if (reminder.event?.id) {
      navigation.navigate('EventDetail' as never, { id: reminder.event.id } as never);
    }
  };

  const openSnoozeDialog = (id: string) => {
    setSelectedReminder(id);
    setSnoozeDialogVisible(true);
    setMenuVisible(null);
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'REACH_OUT': return 'account-voice';
      case 'BIRTHDAY': return 'cake-variant';
      case 'EVENT': return 'calendar';
      case 'SAVINGS': return 'piggy-bank';
      case 'CUSTOM': return 'bell';
      default: return 'bell-outline';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'REACH_OUT': return '#2196F3';
      case 'BIRTHDAY': return '#E91E63';
      case 'EVENT': return '#4CAF50';
      case 'SAVINGS': return '#FF9800';
      case 'CUSTOM': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING': return '#FFC107';
      case 'SENT': return '#2196F3';
      case 'COMPLETED': return '#4CAF50';
      case 'DISMISSED': return '#9E9E9E';
      default: return '#757575';
    }
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const scheduledDate = new Date(item.scheduledDate);
    const isPast = scheduledDate < new Date();
    const timeText = isPast
      ? `${formatDistanceToNow(scheduledDate)} ago`
      : `in ${formatDistanceToNow(scheduledDate)}`;

    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.typeContainer}>
              <IconButton
                icon={getTypeIcon(item.type)}
                iconColor={getTypeColor(item.type)}
                size={24}
                style={styles.typeIcon}
              />
              <View style={styles.titleContainer}>
                <Text variant="titleMedium" style={styles.title}>
                  {item.title}
                </Text>
                <Text variant="bodySmall" style={styles.time}>
                  {isPast ? 'Due ' : 'Due '}{timeText}
                </Text>
              </View>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
            >
              <Menu.Item
                leadingIcon="check"
                onPress={() => handleMarkActedOn(item.id)}
                title="Mark as Done"
              />
              <Menu.Item
                leadingIcon="clock-outline"
                onPress={() => openSnoozeDialog(item.id)}
                title="Snooze"
              />
              {(item.contact || item.event) && (
                <Menu.Item
                  leadingIcon="arrow-right"
                  onPress={() => handleTakeAction(item)}
                  title="View Details"
                />
              )}
              <Divider />
              <Menu.Item
                leadingIcon="close"
                onPress={() => handleDismiss(item.id)}
                title="Dismiss"
              />
            </Menu>
          </View>

          <Text variant="bodyMedium" style={styles.message}>
            {item.message}
          </Text>

          <View style={styles.cardFooter}>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
            >
              {item.status}
            </Chip>
            {item.contact && (
              <Chip
                icon="account"
                style={styles.contextChip}
                textStyle={{ fontSize: 12 }}
                onPress={() => handleTakeAction(item)}
              >
                {item.contact.name}
              </Chip>
            )}
            {item.event && (
              <Chip
                icon="calendar"
                style={styles.contextChip}
                textStyle={{ fontSize: 12 }}
                onPress={() => handleTakeAction(item)}
              >
                {item.event.title}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <Menu
        visible={filterMenuVisible}
        onDismiss={() => setFilterMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setFilterMenuVisible(true)}
            icon="filter-variant"
            compact
          >
            {typeFilter === 'ALL' ? 'All Types' : typeFilter.replace('_', ' ')}
          </Button>
        }
      >
        {(['ALL', 'REACH_OUT', 'BIRTHDAY', 'EVENT', 'SAVINGS', 'CUSTOM'] as FilterType[]).map((type) => (
          <Menu.Item
            key={type}
            onPress={() => {
              setTypeFilter(type);
              setFilterMenuVisible(false);
            }}
            title={type === 'ALL' ? 'All Types' : type.replace('_', ' ')}
            leadingIcon={typeFilter === type ? 'check' : undefined}
          />
        ))}
      </Menu>

      <View style={styles.statusFilters}>
        {(['PENDING', 'SENT', 'COMPLETED'] as StatusFilter[]).map((status) => (
          <Chip
            key={status}
            selected={statusFilter === status}
            onPress={() => setStatusFilter(status)}
            style={styles.filterChip}
            compact
          >
            {status}
          </Chip>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconButton icon="bell-off-outline" size={64} iconColor="#ccc" />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No Reminders
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {statusFilter === 'PENDING'
          ? "You're all caught up! No pending reminders."
          : `No ${statusFilter.toLowerCase()} reminders found.`}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}
      
      <FlatList
        data={reminders}
        renderItem={renderReminder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />

      <Portal>
        <Dialog visible={snoozeDialogVisible} onDismiss={() => setSnoozeDialogVisible(false)}>
          <Dialog.Title>Snooze Reminder</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              value={String(selectedSnoozeDuration)}
              onValueChange={(value) => setSelectedSnoozeDuration(Number(value))}
            >
              {SNOOZE_OPTIONS.map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={String(option.value)}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSnoozeDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSnooze}>Snooze</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  filterContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusFilters: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    margin: 0,
    marginRight: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
  },
  time: {
    color: '#666',
    marginTop: 2,
  },
  message: {
    marginTop: 8,
    color: '#444',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  statusChip: {
    height: 28,
  },
  contextChip: {
    height: 28,
    backgroundColor: '#f0f0f0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 8,
    color: '#666',
  },
  emptyText: {
    marginTop: 4,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
