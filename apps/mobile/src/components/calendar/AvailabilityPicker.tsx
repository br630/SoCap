import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import calendarService, { AvailabilitySlot, AvailabilityParams } from '../../services/calendarService';
import { DatePickerModal } from '../common';

interface AvailabilityPickerProps {
  userIds: string[];
  onSelectSlot: (slot: AvailabilitySlot) => void;
  minDuration?: number; // minutes
  initialDate?: Date;
}

export default function AvailabilityPicker({
  userIds,
  onSelectSlot,
  minDuration = 60,
  initialDate,
}: AvailabilityPickerProps) {
  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [endDate, setEndDate] = useState(() => {
    const date = new Date(initialDate || new Date());
    date.setDate(date.getDate() + 7); // Default to 7 days ahead
    return date;
  });
  const [duration, setDuration] = useState(minDuration);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  useEffect(() => {
    if (userIds.length > 0) {
      loadAvailability();
    }
  }, [userIds, startDate, endDate, duration]);

  const loadAvailability = async () => {
    if (userIds.length === 0) return;

    try {
      setIsLoading(true);
      const params: AvailabilityParams = {
        userIds,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        minDuration: duration,
        preferences: {
          preferAfternoon: true,
          avoidEarlyMorning: true,
          preferWeekdays: true,
        },
      };

      const availabilitySlots = await calendarService.getAvailability(params);
      setSlots(availabilitySlots);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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

  const handleSelectSlot = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    onSelectSlot(slot);
  };

  const durationOptions = [30, 60, 90, 120, 180];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Available Time</Text>
      <Text style={styles.subtitle}>
        Select a date range and duration to find when everyone is available
      </Text>

      {/* Date Range Selectors */}
      <View style={styles.dateRangeContainer}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#007AFF" />
          <View style={styles.dateButtonText}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>
              {startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#007AFF" />
          <View style={styles.dateButtonText}>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateValue}>
              {endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Duration Selector */}
      <View style={styles.durationContainer}>
        <Text style={styles.durationLabel}>Duration</Text>
        <View style={styles.durationChips}>
          {durationOptions.map((mins) => {
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            const label =
              hours > 0
                ? `${hours}h${remainingMins > 0 ? ` ${remainingMins}m` : ''}`
                : `${mins}m`;

            return (
              <Chip
                key={mins}
                selected={duration === mins}
                onPress={() => setDuration(mins)}
                style={styles.durationChip}
                textStyle={styles.durationChipText}
              >
                {label}
              </Chip>
            );
          })}
        </View>
      </View>

      {/* Date Pickers - Cross-platform modals */}
      <DatePickerModal
        visible={showStartDatePicker}
        value={startDate}
        mode="date"
        title="Select Start Date"
        minimumDate={new Date()}
        maximumDate={endDate}
        onConfirm={(selectedDate) => {
          setStartDate(selectedDate);
          setShowStartDatePicker(false);
        }}
        onCancel={() => setShowStartDatePicker(false)}
      />
      <DatePickerModal
        visible={showEndDatePicker}
        value={endDate}
        mode="date"
        title="Select End Date"
        minimumDate={startDate}
        onConfirm={(selectedDate) => {
          setEndDate(selectedDate);
          setShowEndDatePicker(false);
        }}
        onCancel={() => setShowEndDatePicker(false)}
      />

      {/* Availability Slots */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Finding available times...</Text>
        </View>
      ) : slots.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No available slots found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting the date range or duration
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <ScrollView style={styles.slotsContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.slotsTitle}>
            Available Time Slots ({slots.length})
          </Text>
          {slots.map((slot, index) => {
            const isSelected = selectedSlot?.start === slot.start;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.slotCard, isSelected && styles.slotCardSelected]}
                onPress={() => handleSelectSlot(slot)}
              >
                <View style={styles.slotHeader}>
                  <View style={styles.slotTime}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={isSelected ? '#007AFF' : '#666'}
                    />
                    <Text
                      style={[
                        styles.slotTimeText,
                        isSelected && styles.slotTimeTextSelected,
                      ]}
                    >
                      {formatTime(slot.start)} - {formatTime(slot.end)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </View>
                <View style={styles.slotDetails}>
                  <Text style={styles.slotDate}>{formatDate(slot.start)}</Text>
                  {slot.score !== undefined && (
                    <View style={styles.scoreBadge}>
                      <Ionicons name="star" size={12} color="#FFB300" />
                      <Text style={styles.scoreText}>{slot.score}/100</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 2,
  },
  durationContainer: {
    marginBottom: 20,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  durationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    marginRight: 0,
  },
  durationChipText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyCard: {
    marginTop: 20,
    backgroundColor: '#f9f9f9',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  slotsContainer: {
    flex: 1,
  },
  slotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  slotCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  slotCardSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  slotTimeTextSelected: {
    color: '#007AFF',
  },
  slotDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotDate: {
    fontSize: 13,
    color: '#666',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB300',
  },
});
