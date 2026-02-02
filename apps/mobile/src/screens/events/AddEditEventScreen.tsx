import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import eventService from '../../services/eventService';
import { EventIdeaCard } from '../../components/ai';
import { useFetchEventIdeas } from '../../hooks/useAISuggestions';
import { BudgetTier, EventIdea } from '../../services/aiService';

const EVENT_TYPES = [
  { value: 'SOCIAL', label: '🎉 Social', description: 'Parties, hangouts' },
  { value: 'NETWORKING', label: '🤝 Networking', description: 'Professional events' },
  { value: 'DINING', label: '🍽️ Dining', description: 'Meals together' },
  { value: 'ACTIVITY', label: '🎯 Activity', description: 'Sports, games, hobbies' },
  { value: 'CELEBRATION', label: '🎂 Celebration', description: 'Birthdays, milestones' },
  { value: 'TRAVEL', label: '✈️ Travel', description: 'Trips, vacations' },
  { value: 'OTHER', label: '📅 Other', description: 'Everything else' },
];

const BUDGET_TIERS: { value: BudgetTier; label: string; range: string }[] = [
  { value: 'FREE', label: 'Free', range: '$0' },
  { value: 'BUDGET', label: 'Budget', range: '$0-20' },
  { value: 'MODERATE', label: 'Moderate', range: '$20-50' },
  { value: 'PREMIUM', label: 'Premium', range: '$50+' },
];

export default function AddEditEventScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { contactId } = (route.params as { contactId?: string }) || {};

  // Form state
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('SOCIAL');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)); // +2 hours
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('MODERATE');
  const [groupSize, setGroupSize] = useState('2');
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI hook
  const { mutate: fetchEventIdeas, data: eventIdeasData, isPending: isLoadingIdeas } = useFetchEventIdeas();

  const handleGetIdeas = () => {
    setShowAIModal(true);
    fetchEventIdeas({
      budgetTier,
      groupSize: parseInt(groupSize) || 2,
      interests: [],
    });
  };

  const handleSelectIdea = (idea: EventIdea) => {
    setTitle(idea.name);
    setDescription(idea.description);
    // Map venue type to event type
    if (idea.venueType.toLowerCase().includes('restaurant')) {
      setEventType('DINING');
    } else if (idea.venueType.toLowerCase().includes('outdoor')) {
      setEventType('ACTIVITY');
    }
    setShowAIModal(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    setSaving(true);
    try {
      await eventService.createEvent({
        title: title.trim(),
        eventType: eventType as any,
        date: date.toISOString().split('T')[0],
        startTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
        endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
        locationName: locationName.trim() || undefined,
        description: description.trim() || undefined,
        status: 'PLANNING',
        isAllDay: false,
        attendeeIds: contactId ? [contactId] : [],
      });

      Alert.alert('Success', 'Event created!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView}>
        {/* AI Ideas Button */}
        <TouchableOpacity style={styles.aiButton} onPress={handleGetIdeas}>
          <View style={styles.aiButtonContent}>
            <Text style={styles.aiButtonIcon}>🎯</Text>
            <View style={styles.aiButtonText}>
              <Text style={styles.aiButtonTitle}>Need Ideas?</Text>
              <Text style={styles.aiButtonSubtitle}>Get AI-powered event suggestions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7C4DFF" />
        </TouchableOpacity>

        {/* Event Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Coffee with Sarah"
            placeholderTextColor="#999"
          />
        </View>

        {/* Event Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeChip, eventType === type.value && styles.typeChipActive]}
                onPress={() => setEventType(type.value)}
              >
                <Text style={[styles.typeChipText, eventType === type.value && styles.typeChipTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Time */}
        <View style={styles.timeRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.dateButtonText}>{formatTime(startTime)}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                onChange={(e, selectedTime) => {
                  setShowStartPicker(false);
                  if (selectedTime) setStartTime(selectedTime);
                }}
              />
            )}
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.dateButtonText}>{formatTime(endTime)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                onChange={(e, selectedTime) => {
                  setShowEndPicker(false);
                  if (selectedTime) setEndTime(selectedTime);
                }}
              />
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={locationName}
            onChangeText={setLocationName}
            placeholder="e.g., Central Park"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add any details about this event..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Budget for AI */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Budget Range (for AI suggestions)</Text>
          <View style={styles.budgetRow}>
            {BUDGET_TIERS.map((tier) => (
              <TouchableOpacity
                key={tier.value}
                style={[styles.budgetChip, budgetTier === tier.value && styles.budgetChipActive]}
                onPress={() => setBudgetTier(tier.value)}
              >
                <Text style={[styles.budgetChipLabel, budgetTier === tier.value && styles.budgetChipTextActive]}>
                  {tier.label}
                </Text>
                <Text style={[styles.budgetChipRange, budgetTier === tier.value && styles.budgetChipTextActive]}>
                  {tier.range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Group Size */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Size</Text>
          <TextInput
            style={[styles.input, { width: 100 }]}
            value={groupSize}
            onChangeText={setGroupSize}
            placeholder="2"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Ideas Modal */}
      <Modal
        visible={showAIModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAIModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎯 Event Ideas</Text>
            <TouchableOpacity onPress={() => setShowAIModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Budget Selection in Modal */}
          <View style={styles.modalBudgetSection}>
            <Text style={styles.modalBudgetLabel}>Budget:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {BUDGET_TIERS.map((tier) => (
                <TouchableOpacity
                  key={tier.value}
                  style={[styles.modalBudgetChip, budgetTier === tier.value && styles.modalBudgetChipActive]}
                  onPress={() => {
                    setBudgetTier(tier.value);
                    fetchEventIdeas({
                      budgetTier: tier.value,
                      groupSize: parseInt(groupSize) || 2,
                      interests: [],
                    });
                  }}
                >
                  <Text style={[styles.modalBudgetChipText, budgetTier === tier.value && styles.modalBudgetChipTextActive]}>
                    {tier.label} ({tier.range})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.modalContent}>
            <EventIdeaCard
              ideas={eventIdeasData?.ideas || null}
              isLoading={isLoadingIdeas}
              onSelectIdea={handleSelectIdea}
              onRefresh={() => fetchEventIdeas({
                budgetTier,
                groupSize: parseInt(groupSize) || 2,
                interests: [],
              })}
            />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7C4DFF30',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  aiButtonText: {
    flex: 1,
  },
  aiButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C4DFF',
  },
  aiButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  typeScroll: {
    marginHorizontal: -4,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeChipActive: {
    backgroundColor: '#7C4DFF',
    borderColor: '#7C4DFF',
  },
  typeChipText: {
    fontSize: 14,
    color: '#333',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  budgetChipActive: {
    backgroundColor: '#7C4DFF',
    borderColor: '#7C4DFF',
  },
  budgetChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  budgetChipRange: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  budgetChipTextActive: {
    color: '#fff',
  },
  spacer: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#7C4DFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 16,
    color: '#7C4DFF',
    fontWeight: '600',
  },
  modalBudgetSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalBudgetLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  modalBudgetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  modalBudgetChipActive: {
    backgroundColor: '#7C4DFF',
  },
  modalBudgetChipText: {
    fontSize: 13,
    color: '#666',
  },
  modalBudgetChipTextActive: {
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});
