import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/events';
import { CalendarEvent, EventStatus } from '../../services/eventService';

interface CalendarViewProps {
  onEventPress: (eventId: string) => void;
  onCreateEvent: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: '#9E9E9E',
  PLANNING: '#FF9800',
  CONFIRMED: '#4CAF50',
  COMPLETED: '#607D8B',
  CANCELLED: '#F44336',
};

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - 32) / 7;

export default function CalendarView({ onEventPress, onCreateEvent }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { events, eventsByDate, isLoading } = useCalendarEvents(currentYear, currentMonth);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 2, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  }, [today]);

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    return formatDateKey(date) === formatDateKey(today);
  };

  const isSelected = (date: Date) => {
    return selectedDate === formatDateKey(date);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = formatDateKey(date);
    return eventsByDate[dateKey] || [];
  };

  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  const renderDay = ({ item }: { item: { date: Date; isCurrentMonth: boolean } }) => {
    const { date, isCurrentMonth } = item;
    const dateKey = formatDateKey(date);
    const dayEvents = getEventsForDate(date);
    const hasEvents = dayEvents.length > 0;
    const isTodayDate = isToday(date);
    const isSelectedDate = isSelected(date);

    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          !isCurrentMonth && styles.dayCellOtherMonth,
          isSelectedDate && styles.dayCellSelected,
        ]}
        onPress={() => setSelectedDate(dateKey)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.dayNumber,
            isTodayDate && styles.dayNumberToday,
            isSelectedDate && styles.dayNumberSelected,
          ]}
        >
          <Text
            style={[
              styles.dayText,
              !isCurrentMonth && styles.dayTextOtherMonth,
              isTodayDate && styles.dayTextToday,
              isSelectedDate && styles.dayTextSelected,
            ]}
          >
            {date.getDate()}
          </Text>
        </View>

        {/* Event dots */}
        {hasEvents && (
          <View style={styles.eventDots}>
            {dayEvents.slice(0, 3).map((event, index) => (
              <View
                key={event.id}
                style={[
                  styles.eventDot,
                  { backgroundColor: STATUS_COLORS[event.status] },
                ]}
              />
            ))}
            {dayEvents.length > 3 && (
              <Text style={styles.moreDots}>+{dayEvents.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.monthTitle}>
          <Text style={styles.monthText}>
            {MONTHS[currentMonth - 1]} {currentYear}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={calendarDays}
          renderItem={renderDay}
          keyExtractor={(item, index) => `${item.date.toISOString()}-${index}`}
          numColumns={7}
          scrollEnabled={false}
          style={styles.grid}
        />
      )}

      {/* Selected Date Events */}
      {selectedDate && (
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={styles.eventsSectionTitle}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedDateEvents.length === 0 ? (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>No events on this day</Text>
              <TouchableOpacity style={styles.addEventButton} onPress={onCreateEvent}>
                <Ionicons name="add" size={18} color="#007AFF" />
                <Text style={styles.addEventText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={selectedDateEvents}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.eventItem}
                  onPress={() => onEventPress(item.id)}
                >
                  <View
                    style={[
                      styles.eventColorBar,
                      { backgroundColor: STATUS_COLORS[item.status] },
                    ]}
                  />
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {item.startTime} - {item.endTime}
                    </Text>
                  </View>
                  {item.attendeeCount > 0 && (
                    <View style={styles.eventAttendees}>
                      <Ionicons name="people" size={14} color="#666" />
                      <Text style={styles.eventAttendeesText}>{item.attendeeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              style={styles.eventsList}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekdayCell: {
    width: DAY_WIDTH,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  grid: {
    paddingHorizontal: 16,
  },
  dayCell: {
    width: DAY_WIDTH,
    height: 64,
    alignItems: 'center',
    paddingTop: 4,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberToday: {
    backgroundColor: '#007AFF',
  },
  dayNumberSelected: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  dayTextOtherMonth: {
    color: '#ccc',
  },
  dayTextToday: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  eventDots: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
    alignItems: 'center',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreDots: {
    fontSize: 8,
    color: '#666',
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  eventsSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  noEventsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noEventsText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
  },
  addEventText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  eventsList: {
    flex: 1,
    padding: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  eventColorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
  },
  eventAttendeesText: {
    fontSize: 12,
    color: '#666',
  },
});
