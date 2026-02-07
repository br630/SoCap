import React, { useState, useEffect, useMemo } from 'react';
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
  Linking,
  FlatList,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Checkbox, Searchbar, Avatar, Chip, ActivityIndicator } from 'react-native-paper';
import eventService from '../../services/eventService';
import contactService, { Contact } from '../../services/contactService';
import { EventIdeaCard } from '../../components/ai';
import { useFetchEventIdeas } from '../../hooks/useAISuggestions';
import { BudgetTier, EventIdea } from '../../services/aiService';
import { DatePickerModal } from '../../components/common';

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

interface SelectedAttendee {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  profileImage?: string;
}

export default function AddEditEventScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { contactId, preSelectedAttendees, contactName } = (route.params as { 
    contactId?: string;
    preSelectedAttendees?: string[];
    contactName?: string;
  }) || {};

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
  
  // Attendee state
  const [selectedAttendees, setSelectedAttendees] = useState<SelectedAttendee[]>([]);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendInvitations, setSendInvitations] = useState(true);
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI hook
  const { mutate: fetchEventIdeas, data: eventIdeasData, isPending: isLoadingIdeas } = useFetchEventIdeas();

  // Calculate duration
  const duration = useMemo(() => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return 'Invalid time range';
    if (diffHours === 0) return `${diffMinutes} min`;
    if (diffMinutes === 0) return `${diffHours} hr`;
    return `${diffHours} hr ${diffMinutes} min`;
  }, [startTime, endTime]);

  // Load contacts for selection
  useEffect(() => {
    loadContacts();
  }, []);

  // Auto-update group size when attendees change
  useEffect(() => {
    // +1 to include the user themselves
    const totalPeople = selectedAttendees.length + 1;
    setGroupSize(totalPeople.toString());
  }, [selectedAttendees]);

  // Pre-select attendees if provided
  useEffect(() => {
    if (preSelectedAttendees && contacts.length > 0) {
      const preSelected = contacts.filter(c => preSelectedAttendees.includes(c.id));
      setSelectedAttendees(preSelected.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        profileImage: c.profileImage,
      })));
    } else if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setSelectedAttendees([{
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          profileImage: contact.profileImage,
        }]);
      }
    }
  }, [preSelectedAttendees, contactId, contacts]);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await contactService.getContacts({ limit: 100 });
      setContacts(response.data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
  }, [contacts, searchQuery]);

  const toggleAttendee = (contact: Contact) => {
    const isSelected = selectedAttendees.some(a => a.id === contact.id);
    if (isSelected) {
      setSelectedAttendees(selectedAttendees.filter(a => a.id !== contact.id));
    } else {
      setSelectedAttendees([...selectedAttendees, {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        profileImage: contact.profileImage,
      }]);
    }
  };

  const removeAttendee = (id: string) => {
    setSelectedAttendees(selectedAttendees.filter(a => a.id !== id));
  };

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

  const sendInvitation = (attendee: SelectedAttendee) => {
    const eventDateStr = formatDate(date);
    const eventTimeStr = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    
    const message = `🎉 You're invited!\n\n` +
      `${title}\n` +
      `📅 ${eventDateStr}\n` +
      `⏰ ${eventTimeStr}\n` +
      `${locationName ? `📍 ${locationName}\n` : ''}` +
      `${description ? `\n${description}\n` : ''}` +
      `\nLet me know if you can make it!`;

    // Show options for sending
    Alert.alert(
      `Invite ${attendee.name}`,
      'How would you like to send the invitation?',
      [
        {
          text: 'SMS',
          onPress: () => {
            if (attendee.phone) {
              Linking.openURL(`sms:${attendee.phone}?body=${encodeURIComponent(message)}`);
            } else {
              Alert.alert('No Phone', `${attendee.name} doesn't have a phone number`);
            }
          },
        },
        {
          text: 'WhatsApp',
          onPress: () => {
            if (attendee.phone) {
              const cleanPhone = attendee.phone.replace(/\D/g, '');
              Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`);
            } else {
              Alert.alert('No Phone', `${attendee.name} doesn't have a phone number`);
            }
          },
        },
        {
          text: 'Email',
          onPress: () => {
            if (attendee.email) {
              Linking.openURL(`mailto:${attendee.email}?subject=${encodeURIComponent(`You're invited: ${title}`)}&body=${encodeURIComponent(message)}`);
            } else {
              Alert.alert('No Email', `${attendee.name} doesn't have an email address`);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const sendAllInvitations = () => {
    const eventDateStr = formatDate(date);
    const eventTimeStr = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    
    const message = `🎉 You're invited!\n\n` +
      `${title}\n` +
      `📅 ${eventDateStr}\n` +
      `⏰ ${eventTimeStr}\n` +
      `${locationName ? `📍 ${locationName}\n` : ''}` +
      `${description ? `\n${description}\n` : ''}` +
      `\nLet me know if you can make it!`;

    // For now, we'll compose a group message via SMS
    const phones = selectedAttendees
      .filter(a => a.phone)
      .map(a => a.phone)
      .join(',');
    
    if (phones) {
      Linking.openURL(`sms:${phones}?body=${encodeURIComponent(message)}`);
    } else {
      Alert.alert('No Phone Numbers', 'None of the selected attendees have phone numbers');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    setSaving(true);
    try {
      const attendeeIds = selectedAttendees.map(a => a.id);
      
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
        attendeeIds,
      });

      // Ask if user wants to send invitations
      if (sendInvitations && selectedAttendees.length > 0) {
        Alert.alert(
          'Event Created! 🎉',
          `Would you like to send invitations to ${selectedAttendees.length} attendee${selectedAttendees.length > 1 ? 's' : ''}?`,
          [
            {
              text: 'Send Invitations',
              onPress: () => {
                sendAllInvitations();
                navigation.goBack();
              },
            },
            {
              text: 'Maybe Later',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Event created!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
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
          <DatePickerModal
            visible={showDatePicker}
            value={date}
            mode="date"
            title="Select Date"
            minimumDate={new Date()}
            onConfirm={(selectedDate) => {
              setDate(selectedDate);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </View>

        {/* Time */}
        <View style={styles.timeRow}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.dateButtonText}>{formatTime(startTime)}</Text>
            </TouchableOpacity>
            <DatePickerModal
              visible={showStartPicker}
              value={startTime}
              mode="time"
              title="Select Start Time"
              onConfirm={(selectedTime) => {
                setStartTime(selectedTime);
                setShowStartPicker(false);
              }}
              onCancel={() => setShowStartPicker(false)}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.dateButtonText}>{formatTime(endTime)}</Text>
            </TouchableOpacity>
            <DatePickerModal
              visible={showEndPicker}
              value={endTime}
              mode="time"
              title="Select End Time"
              onConfirm={(selectedTime) => {
                setEndTime(selectedTime);
                setShowEndPicker(false);
              }}
              onCancel={() => setShowEndPicker(false)}
            />
          </View>
        </View>

        {/* Duration Display */}
        <View style={styles.durationContainer}>
          <Ionicons name="hourglass-outline" size={18} color="#7C4DFF" />
          <Text style={styles.durationText}>Duration: {duration}</Text>
        </View>

        {/* Attendees Section */}
        <View style={styles.inputGroup}>
          <View style={styles.attendeesHeader}>
            <Text style={styles.label}>Invite People</Text>
            <TouchableOpacity 
              style={styles.addAttendeeButton}
              onPress={() => setShowAttendeeModal(true)}
            >
              <Ionicons name="person-add" size={18} color="#7C4DFF" />
              <Text style={styles.addAttendeeText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {selectedAttendees.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyAttendees}
              onPress={() => setShowAttendeeModal(true)}
            >
              <Ionicons name="people-outline" size={32} color="#ccc" />
              <Text style={styles.emptyAttendeesText}>Tap to add attendees</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.attendeesList}>
              {selectedAttendees.map((attendee) => (
                <View key={attendee.id} style={styles.attendeeChip}>
                  <Avatar.Text 
                    size={28} 
                    label={attendee.name.charAt(0).toUpperCase()}
                    style={styles.attendeeAvatar}
                  />
                  <Text style={styles.attendeeName} numberOfLines={1}>{attendee.name}</Text>
                  <TouchableOpacity 
                    onPress={() => sendInvitation(attendee)}
                    style={styles.sendInviteButton}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color="#7C4DFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeAttendee(attendee.id)}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Send all invitations toggle */}
              <View style={styles.sendAllContainer}>
                <Checkbox
                  status={sendInvitations ? 'checked' : 'unchecked'}
                  onPress={() => setSendInvitations(!sendInvitations)}
                  color="#7C4DFF"
                />
                <Text style={styles.sendAllText}>Send invitations when event is created</Text>
              </View>
            </View>
          )}
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

      {/* Attendee Selection Modal */}
      <Modal
        visible={showAttendeeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAttendeeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Attendees</Text>
            <TouchableOpacity onPress={() => setShowAttendeeModal(false)}>
              <Text style={styles.modalClose}>Done ({selectedAttendees.length})</Text>
            </TouchableOpacity>
          </View>

          <Searchbar
            placeholder="Search contacts..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />

          {loadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C4DFF" />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.contactsList}
              renderItem={({ item }) => {
                const isSelected = selectedAttendees.some(a => a.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.contactItem, isSelected && styles.contactItemSelected]}
                    onPress={() => toggleAttendee(item)}
                  >
                    <Checkbox
                      status={isSelected ? 'checked' : 'unchecked'}
                      color="#7C4DFF"
                    />
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.contactAvatar} />
                    ) : (
                      <Avatar.Text 
                        size={40} 
                        label={item.name.charAt(0).toUpperCase()}
                        style={styles.contactAvatarText}
                      />
                    )}
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      {item.phone && (
                        <Text style={styles.contactDetail}>{item.phone}</Text>
                      )}
                      {item.email && !item.phone && (
                        <Text style={styles.contactDetail}>{item.email}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#7C4DFF" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContactsList}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyContactsText}>
                    {searchQuery ? 'No contacts found' : 'No contacts yet'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

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
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: -10,
    gap: 6,
  },
  durationText: {
    fontSize: 14,
    color: '#7C4DFF',
    fontWeight: '500',
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addAttendeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3E5FF',
  },
  addAttendeeText: {
    fontSize: 13,
    color: '#7C4DFF',
    fontWeight: '500',
  },
  emptyAttendees: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyAttendeesText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  attendeesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 8,
  },
  attendeeAvatar: {
    backgroundColor: '#7C4DFF',
  },
  attendeeName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sendInviteButton: {
    padding: 4,
  },
  sendAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sendAllText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  searchBar: {
    margin: 16,
    marginTop: 8,
    elevation: 0,
    backgroundColor: '#f0f0f0',
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
  contactsList: {
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  contactItemSelected: {
    backgroundColor: '#F3E5FF',
    borderWidth: 1,
    borderColor: '#7C4DFF',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactAvatarText: {
    backgroundColor: '#7C4DFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  contactDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyContactsList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContactsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});
