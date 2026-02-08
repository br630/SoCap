import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  ProgressBar,
  Chip,
  Switch,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEventMutations, useEventTemplates, useEvent } from '../../hooks/useEvents';
import { DateRangePicker } from '../../components/common';
import { EventTemplateCard, BudgetTierBadge } from '../../components/events';
import {
  BudgetTier,
  EventStatus,
  EventTemplate,
  CreateEventData,
  VenueSuggestion,
} from '../../services/eventService';
import aiService from '../../services/aiService';
import calendarService, { Conflict, AvailabilitySlot } from '../../services/calendarService';
import { ConflictWarning, AvailabilityPicker } from '../../components/calendar';
import { useAuth } from '../../hooks/useAuth';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const BUDGET_TIERS: { value: BudgetTier; label: string; description: string }[] = [
  { value: 'FREE', label: 'Free', description: '$0' },
  { value: 'BUDGET', label: 'Budget', description: '$1-50' },
  { value: 'MODERATE', label: 'Moderate', description: '$50-200' },
  { value: 'PREMIUM', label: 'Premium', description: '$200+' },
];

export default function CreateEventScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, mode } = (route.params as { eventId?: string; mode?: 'edit' } | undefined) || {};
  const isEditing = mode === 'edit' && eventId;

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  // Date/time selection handled by DateRangePicker

  // Location
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationPlaceId, setLocationPlaceId] = useState<string | undefined>();
  const [locationLat, setLocationLat] = useState<number | undefined>();
  const [locationLng, setLocationLng] = useState<number | undefined>();

  // Budget
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('BUDGET');
  const [createSavingsGoal, setCreateSavingsGoal] = useState(false);

  // AI Ideas
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<any[]>([]);

  // Calendar integration
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showAvailabilityPicker, setShowAvailabilityPicker] = useState(false);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Convert string times to Date objects for the TimePicker
  const startTimeAsDate = useMemo(() => {
    const [h, m] = startTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [startTime]);

  const endTimeAsDate = useMemo(() => {
    const [h, m] = endTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [endTime]);

  const { templates, templatesByCategory, categories, isLoading: isLoadingTemplates } = useEventTemplates();
  const { createEventAsync, isCreating, updateEventAsync, isUpdating } = useEventMutations();
  const { event: existingEvent, isLoading: isLoadingEvent } = useEvent(isEditing ? eventId : undefined);
  const { user } = useAuth();

  // Load existing event data for editing
  useEffect(() => {
    if (isEditing && existingEvent) {
      setTitle(existingEvent.title);
      setDescription(existingEvent.description || '');
      setEventType(existingEvent.eventType);
      setDate(new Date(existingEvent.date));
      setStartTime(existingEvent.startTime);
      setEndTime(existingEvent.endTime);
      setLocationName(existingEvent.locationName || '');
      setLocationAddress(existingEvent.locationAddress || '');
      setLocationPlaceId(existingEvent.locationPlaceId || undefined);
      setLocationLat(existingEvent.locationLat || undefined);
      setLocationLng(existingEvent.locationLng || undefined);
      setEstimatedCost(existingEvent.estimatedCost.toString());
      setBudgetTier(existingEvent.budgetTier);
      setSyncToCalendar(!!existingEvent.calendarEventId);
      if (existingEvent.attendees) {
        setSelectedAttendeeIds(existingEvent.attendees.map((a) => a.contactId));
      }
      setStep(2); // Skip template selection
    }
  }, [isEditing, existingEvent]);

  // Check for conflicts when date/time changes
  useEffect(() => {
    if (step === 2 && user?.id && date && startTime && endTime) {
      checkConflicts();
    }
  }, [date, startTime, endTime, step, user?.id]);

  // Load attendee IDs from route params (when coming from SelectAttendeesScreen)
  useEffect(() => {
    const params = route.params as { attendeeIds?: string[] } | undefined;
    if (params?.attendeeIds) {
      setSelectedAttendeeIds(params.attendeeIds);
    }
  }, [route.params]);

  const checkConflicts = async () => {
    if (!user?.id) return;

    try {
      setIsCheckingConflicts(true);
      const conflicts = await calendarService.getConflicts(
        user.id,
        date,
        startTime,
        endTime
      );
      setConflicts(conflicts);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  const handleSelectAvailabilitySlot = (slot: AvailabilitySlot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    
    setDate(start);
    setStartTime(start.toTimeString().slice(0, 5));
    setEndTime(end.toTimeString().slice(0, 5));
    setShowAvailabilityPicker(false);
  };

  const handleSelectTemplate = useCallback((template: EventTemplate) => {
    setSelectedTemplate(template);
    setEventType(template.eventType);
    setTitle(template.name);
    setDescription(template.description);
    setBudgetTier(template.suggestedBudgetTier);
    setEstimatedCost(
      Math.round((template.estimatedCostRange.min + template.estimatedCostRange.max) / 2).toString()
    );
    setStep(2);
  }, []);

  const handleSelectVenue = useCallback((venue: VenueSuggestion) => {
    setLocationName(venue.name);
    setLocationAddress(venue.address);
    setLocationPlaceId(venue.placeId);
    setLocationLat(venue.location?.lat);
    setLocationLng(venue.location?.lng);
    navigation.goBack();
  }, [navigation]);

  const handleGetAIIdeas = useCallback(async () => {
    setIsLoadingIdeas(true);
    try {
      const response = await aiService.getEventIdeas({
        budgetTier,
        groupSize: 5,
        location: locationAddress || undefined,
      });
      setAiIdeas(response.ideas);
    } catch (error) {
      Alert.alert('Error', 'Failed to get AI ideas');
    } finally {
      setIsLoadingIdeas(false);
    }
  }, [budgetTier, locationAddress]);

  const handleSubmit = useCallback(async () => {
    const eventData: CreateEventData = {
      title,
      description: description || undefined,
      eventType,
      date: date.toISOString(),
      startTime,
      endTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locationName: locationName || undefined,
      locationAddress: locationAddress || undefined,
      locationPlaceId,
      locationLat,
      locationLng,
      estimatedCost: parseFloat(estimatedCost) || 0,
      budgetTier,
      status: 'PLANNING' as EventStatus,
      createSavingsGoal,
    };

    try {
      let savedEvent;
      if (isEditing && eventId) {
        savedEvent = await updateEventAsync({ id: eventId, data: eventData });
        Alert.alert('Success', 'Event updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        savedEvent = await createEventAsync(eventData);
        // Navigate directly to the event detail page
        navigation.replace('EventDetail' as never, { id: savedEvent.id } as never);
      }

      // Sync to calendar if requested
      if (syncToCalendar && savedEvent?.id) {
        try {
          await calendarService.syncEventToCalendar(savedEvent.id);
        } catch (error) {
          console.error('Failed to sync to calendar:', error);
          // Don't show error to user, sync is optional
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save event');
    }
  }, [
    title,
    description,
    eventType,
    date,
    startTime,
    endTime,
    locationName,
    locationAddress,
    locationPlaceId,
    locationLat,
    locationLng,
    estimatedCost,
    budgetTier,
    createSavingsGoal,
    syncToCalendar,
    isEditing,
    eventId,
    createEventAsync,
    updateEventAsync,
    navigation,
  ]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return selectedTemplate !== null || eventType.trim() !== '';
      case 2:
        return title.trim() !== '' && eventType.trim() !== '';
      case 3:
        return true; // Location is optional
      case 4:
        return true; // Budget defaults are fine
      case 5:
        return true; // Review step
      default:
        return false;
    }
  }, [step, selectedTemplate, eventType, title]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Choose a Template</Text>
            <Text style={styles.stepSubtitle}>
              Start with a template or create a custom event
            </Text>

            {/* Custom Event Option */}
            <TouchableOpacity
              style={[
                styles.customOption,
                selectedTemplate === null && eventType === 'custom' && styles.customOptionSelected,
              ]}
              onPress={() => {
                setSelectedTemplate(null);
                setEventType('custom');
              }}
            >
              <Ionicons name="create-outline" size={24} color="#007AFF" />
              <View style={styles.customOptionText}>
                <Text style={styles.customOptionTitle}>Custom Event</Text>
                <Text style={styles.customOptionDesc}>Create from scratch</Text>
              </View>
              <Ionicons
                name={eventType === 'custom' ? 'checkmark-circle' : 'chevron-forward'}
                size={24}
                color={eventType === 'custom' ? '#34C759' : '#ccc'}
              />
            </TouchableOpacity>

            {/* Template Categories */}
            {isLoadingTemplates ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              categories.map((category) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {templatesByCategory[category]?.map((template) => (
                      <EventTemplateCard
                        key={template.id}
                        template={template}
                        onPress={() => handleSelectTemplate(template)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Basic Info</Text>
            <Text style={styles.stepSubtitle}>Tell us about your event</Text>

            <TextInput
              label="Event Title *"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Event Type *"
              value={eventType}
              onChangeText={setEventType}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., birthday, dinner, concert"
            />

            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />

            {/* Date & Time Range */}
            <DateRangePicker
              startDate={startTimeAsDate}
              endDate={endTimeAsDate}
              minimumDate={new Date()}
              onApply={(start, end) => {
                setDate(start);
                const sh = start.getHours().toString().padStart(2, '0');
                const sm = start.getMinutes().toString().padStart(2, '0');
                setStartTime(`${sh}:${sm}`);
                const eh = end.getHours().toString().padStart(2, '0');
                const em = end.getMinutes().toString().padStart(2, '0');
                setEndTime(`${eh}:${em}`);
              }}
            />

            {/* Conflict Warning */}
            {isCheckingConflicts ? (
              <View style={styles.checkingConflicts}>
                <ActivityIndicator size="small" />
                <Text style={styles.checkingConflictsText}>Checking for conflicts...</Text>
              </View>
            ) : conflicts.length > 0 ? (
              <ConflictWarning
                conflicts={conflicts}
                onProceed={() => setConflicts([])}
                onChangeTime={() => {
                  setConflicts([]);
                  setShowAvailabilityPicker(true);
                }}
              />
            ) : null}

            {/* Availability Picker Button (if multiple attendees) */}
            {selectedAttendeeIds.length > 1 && (
              <TouchableOpacity
                style={styles.availabilityButton}
                onPress={() => setShowAvailabilityPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                <View style={styles.availabilityButtonText}>
                  <Text style={styles.availabilityButtonTitle}>Find Available Time</Text>
                  <Text style={styles.availabilityButtonSubtitle}>
                    Check when {selectedAttendeeIds.length} attendees are free
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}

            {/* Availability Picker Modal */}
            {showAvailabilityPicker && (
              <View style={styles.availabilityModal}>
                <View style={styles.availabilityModalHeader}>
                  <Text style={styles.availabilityModalTitle}>Select Available Time</Text>
                  <TouchableOpacity onPress={() => setShowAvailabilityPicker(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <AvailabilityPicker
                  userIds={[user?.id || '', ...selectedAttendeeIds]}
                  onSelectSlot={handleSelectAvailabilitySlot}
                  minDuration={60}
                  initialDate={date}
                />
              </View>
            )}

            {/* Date/Time pickers replaced by DateRangePicker above */}
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.stepSubtitle}>Where will the event be?</Text>

            {/* Search Venues Button */}
            <TouchableOpacity
              style={styles.searchVenueButton}
              onPress={() => navigation.navigate('VenueSearch' as never, { onSelect: handleSelectVenue } as never)}
            >
              <Ionicons name="search" size={20} color="#007AFF" />
              <Text style={styles.searchVenueText}>Search for a venue</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>— or enter manually —</Text>

            <TextInput
              label="Venue Name"
              value={locationName}
              onChangeText={setLocationName}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., Central Park, Joe's Restaurant"
            />

            <TextInput
              label="Address"
              value={locationAddress}
              onChangeText={setLocationAddress}
              style={styles.input}
              mode="outlined"
              placeholder="123 Main St, City, State"
              multiline
            />
          </ScrollView>
        );

      case 4:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Budget & Guests</Text>
            <Text style={styles.stepSubtitle}>Plan your spending</Text>

            {/* Budget Tier */}
            <Text style={styles.fieldLabel}>Budget Tier</Text>
            <View style={styles.tierButtons}>
              {BUDGET_TIERS.map((tier) => (
                <TouchableOpacity
                  key={tier.value}
                  style={[
                    styles.tierButton,
                    budgetTier === tier.value && styles.tierButtonSelected,
                  ]}
                  onPress={() => setBudgetTier(tier.value)}
                >
                  <Text
                    style={[
                      styles.tierButtonLabel,
                      budgetTier === tier.value && styles.tierButtonLabelSelected,
                    ]}
                  >
                    {tier.label}
                  </Text>
                  <Text style={styles.tierButtonDesc}>{tier.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              label="Estimated Cost ($)"
              value={estimatedCost}
              onChangeText={setEstimatedCost}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
            />

            {/* Create Savings Goal */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Create Savings Goal</Text>
                <Text style={styles.switchDesc}>
                  Automatically track savings for this event
                </Text>
              </View>
              <Switch value={createSavingsGoal} onValueChange={setCreateSavingsGoal} />
            </View>

            {/* AI Ideas Button */}
            <TouchableOpacity
              style={styles.aiButton}
              onPress={handleGetAIIdeas}
              disabled={isLoadingIdeas}
            >
              <Text style={styles.aiButtonIcon}>✨</Text>
              <View style={styles.aiButtonText}>
                <Text style={styles.aiButtonTitle}>Get AI Ideas</Text>
                <Text style={styles.aiButtonSubtitle}>
                  Get personalized event suggestions
                </Text>
              </View>
              {isLoadingIdeas ? (
                <ActivityIndicator size="small" color="#5856D6" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#5856D6" />
              )}
            </TouchableOpacity>

            {/* AI Ideas Results */}
            {aiIdeas.length > 0 && (
              <View style={styles.aiIdeasSection}>
                <Text style={styles.aiIdeasTitle}>💡 Suggestions</Text>
                {aiIdeas.map((idea, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.aiIdeaCard}
                    onPress={() => {
                      setTitle(idea.name);
                      setDescription(idea.description);
                      setEstimatedCost(idea.estimatedCost.toString());
                    }}
                  >
                    <Text style={styles.aiIdeaName}>{idea.name}</Text>
                    <Text style={styles.aiIdeaDesc}>{idea.description}</Text>
                    <Text style={styles.aiIdeaCost}>
                      ~${idea.estimatedCost} • {idea.duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        );

      case 5:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Review</Text>
            <Text style={styles.stepSubtitle}>Confirm your event details</Text>

            <Card style={styles.reviewCard}>
              <Card.Content>
                <Text style={styles.reviewTitle}>{title}</Text>
                <Chip style={styles.reviewChip}>{eventType}</Chip>

                {description && (
                  <Text style={styles.reviewDesc}>{description}</Text>
                )}

                <View style={styles.reviewRow}>
                  <Ionicons name="calendar" size={18} color="#666" />
                  <Text style={styles.reviewText}>
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.reviewRow}>
                  <Ionicons name="time" size={18} color="#666" />
                  <Text style={styles.reviewText}>
                    {formatTime(startTime)} - {formatTime(endTime)}
                  </Text>
                </View>

                {locationName && (
                  <View style={styles.reviewRow}>
                    <Ionicons name="location" size={18} color="#666" />
                    <Text style={styles.reviewText}>{locationName}</Text>
                  </View>
                )}

                <View style={styles.reviewRow}>
                  <Ionicons name="wallet" size={18} color="#666" />
                  <Text style={styles.reviewText}>
                    ${estimatedCost} • {budgetTier}
                  </Text>
                </View>

                {createSavingsGoal && (
                  <View style={styles.reviewRow}>
                    <Ionicons name="save" size={18} color="#34C759" />
                    <Text style={[styles.reviewText, { color: '#34C759' }]}>
                      Savings goal will be created
                    </Text>
                  </View>
                )}

                {/* Sync to Calendar Option */}
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Add to Calendar</Text>
                    <Text style={styles.switchDesc}>
                      Sync this event to your Google Calendar
                    </Text>
                  </View>
                  <Switch value={syncToCalendar} onValueChange={setSyncToCalendar} />
                </View>
              </Card.Content>
            </Card>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  if (isEditing && isLoadingEvent) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar progress={step / 5} color="#007AFF" style={styles.progressBar} />
        <Text style={styles.progressText}>Step {step} of 5</Text>
      </View>

      {/* Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <View style={styles.buttonRow}>
        {step > 1 && (
          <Button
            mode="outlined"
            onPress={() => setStep((s) => (s - 1) as WizardStep)}
            style={styles.backButton}
          >
            Back
          </Button>
        )}
        <Button
          mode="contained"
          onPress={() => {
            if (step === 5) {
              handleSubmit();
            } else {
              setStep((s) => (s + 1) as WizardStep);
            }
          }}
          disabled={!canProceed() || isCreating || isUpdating}
          loading={isCreating || isUpdating}
          style={styles.nextButton}
        >
          {step === 5 ? (isEditing ? 'Save Changes' : 'Create Event') : 'Next'}
        </Button>
      </View>
    </KeyboardAvoidingView>
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
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.6,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  customOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  customOptionText: {
    flex: 1,
  },
  customOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  customOptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 40,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeText: {
    flex: 1,
    marginLeft: 12,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#666',
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginTop: 2,
  },
  searchVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchVenueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  tierButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tierButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  tierButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  tierButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tierButtonLabelSelected: {
    color: '#007AFF',
  },
  tierButtonDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  switchDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5856D620',
  },
  aiButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  aiButtonText: {
    flex: 1,
  },
  aiButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5856D6',
  },
  aiButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  aiIdeasSection: {
    marginTop: 8,
  },
  aiIdeasTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  aiIdeaCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#5856D6',
  },
  aiIdeaName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  aiIdeaDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  aiIdeaCost: {
    fontSize: 12,
    color: '#5856D6',
    marginTop: 8,
    fontWeight: '500',
  },
  reviewCard: {
    marginTop: 8,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  reviewChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  reviewDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reviewText: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  checkingConflicts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 12,
  },
  checkingConflictsText: {
    fontSize: 13,
    color: '#666',
  },
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  availabilityButtonText: {
    flex: 1,
  },
  availabilityButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  availabilityButtonSubtitle: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
    opacity: 0.8,
  },
  availabilityModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  availabilityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  availabilityModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
