import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, FAB, Text, ActivityIndicator, Chip, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/events';
import CalendarView from './CalendarView';
import { EventStatus } from '../../services/eventService';

type ViewMode = 'list' | 'calendar';
type FilterStatus = 'UPCOMING' | 'PAST' | 'CANCELLED' | 'ALL';

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'PAST', label: 'Past' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function EventListScreen() {
  const navigation = useNavigation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('UPCOMING');
  const [page, setPage] = useState(1);

  // Calculate date filters based on status filter
  const getDateFilters = useCallback(() => {
    const now = new Date().toISOString();
    switch (statusFilter) {
      case 'UPCOMING':
        return { dateFrom: now, status: undefined };
      case 'PAST':
        return { dateTo: now, status: 'COMPLETED' as EventStatus };
      case 'CANCELLED':
        return { status: 'CANCELLED' as EventStatus };
      default:
        return {};
    }
  }, [statusFilter]);

  const { events, pagination, isLoading, isError, refetch } = useEvents({
    filters: getDateFilters(),
    page,
    limit: 20,
    enabled: viewMode === 'list',
  });

  const handleRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (pagination && page < pagination.totalPages && !isLoading) {
      setPage((p) => p + 1);
    }
  }, [pagination, page, isLoading]);

  const handleEventPress = useCallback(
    (eventId: string) => {
      navigation.navigate('EventDetail' as never, { id: eventId } as never);
    },
    [navigation]
  );

  const handleCreateEvent = useCallback(() => {
    navigation.navigate('CreateEvent' as never);
  }, [navigation]);

  const renderEmptyState = () => {
    let message = 'No events found';
    let subMessage = 'Create your first event to get started';

    if (statusFilter === 'UPCOMING') {
      message = 'No upcoming events';
      subMessage = 'Plan something special with your friends!';
    } else if (statusFilter === 'PAST') {
      message = 'No past events';
      subMessage = 'Your completed events will appear here';
    } else if (statusFilter === 'CANCELLED') {
      message = 'No cancelled events';
      subMessage = 'Good news! Nothing was cancelled';
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>{message}</Text>
        <Text style={styles.emptySubtext}>{subMessage}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            { value: 'list', label: 'List', icon: 'view-list' },
            { value: 'calendar', label: 'Calendar', icon: 'calendar-month' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {viewMode === 'list' ? (
        <>
          {/* Status Filter Chips */}
          <View style={styles.filterContainer}>
            <FlatList
              horizontal
              data={STATUS_FILTERS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Chip
                  selected={statusFilter === item.value}
                  onPress={() => {
                    setStatusFilter(item.value);
                    setPage(1);
                  }}
                  style={styles.chip}
                  mode={statusFilter === item.value ? 'flat' : 'outlined'}
                >
                  {item.label}
                </Chip>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
            />
          </View>

          {/* Loading State */}
          {isLoading && events.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Failed to load events</Text>
              <Text style={styles.errorSubtext}>Please try again</Text>
            </View>
          ) : events.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={events}
              renderItem={({ item }) => (
                <EventCard event={item} onPress={() => handleEventPress(item.id)} />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoading && events.length > 0 ? (
                  <ActivityIndicator style={styles.footerLoader} />
                ) : null
              }
            />
          )}
        </>
      ) : (
        <CalendarView onEventPress={handleEventPress} onCreateEvent={handleCreateEvent} />
      )}

      <FAB icon="plus" style={styles.fab} onPress={handleCreateEvent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  viewToggle: {
    padding: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
  },
  filterContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 8,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    opacity: 0.6,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
  },
});
