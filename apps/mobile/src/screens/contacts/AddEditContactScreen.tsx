import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, Image } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  SegmentedButtons,
  Chip,
  Portal,
  Dialog,
  ActivityIndicator,
  IconButton,
  Card,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useContact } from '../../hooks/useContact';
import { useContacts } from '../../hooks/useContacts';
import contactService, { CreateContactData, UpdateContactData } from '../../services/contactService';
import { ContactStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { CalendarPicker } from '../../components/common';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radii, shadows } from '../../theme/paperTheme';

const RELATIONSHIP_TYPES = ['FAMILY', 'FRIEND', 'COLLEAGUE', 'ROMANTIC', 'OTHER'] as const;

// Dynamic tiers based on relationship type
const TIERS_BY_TYPE: Record<typeof RELATIONSHIP_TYPES[number], { value: string; label: string }[]> = {
  FAMILY: [
    { value: 'INNER_CIRCLE', label: 'Immediate' },
    { value: 'CLOSE_FRIENDS', label: 'Close Family' },
    { value: 'FRIENDS', label: 'Extended' },
    { value: 'ACQUAINTANCES', label: 'Distant' },
  ],
  FRIEND: [
    { value: 'INNER_CIRCLE', label: 'Best Friends' },
    { value: 'CLOSE_FRIENDS', label: 'Close Friends' },
    { value: 'FRIENDS', label: 'Friends' },
    { value: 'ACQUAINTANCES', label: 'Acquaintances' },
  ],
  COLLEAGUE: [
    { value: 'INNER_CIRCLE', label: 'Close Teammate' },
    { value: 'CLOSE_FRIENDS', label: 'Teammate' },
    { value: 'FRIENDS', label: 'Coworker' },
    { value: 'ACQUAINTANCES', label: 'Work Contact' },
    { value: 'PROFESSIONAL', label: 'External' },
  ],
  ROMANTIC: [
    { value: 'INNER_CIRCLE', label: 'Partner' },
    { value: 'CLOSE_FRIENDS', label: 'Dating' },
    { value: 'FRIENDS', label: 'Seeing' },
    { value: 'ACQUAINTANCES', label: 'Talking' },
  ],
  OTHER: [
    { value: 'INNER_CIRCLE', label: 'Very Close' },
    { value: 'CLOSE_FRIENDS', label: 'Close' },
    { value: 'FRIENDS', label: 'Friendly' },
    { value: 'ACQUAINTANCES', label: 'Acquaintance' },
    { value: 'PROFESSIONAL', label: 'Professional' },
  ],
};

export default function AddEditContactScreen() {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<ContactStackParamList>>();
  const { contactId } = (route.params as { contactId?: string }) || {};
  const isEditing = !!contactId;

  const { contact, isLoading: loadingContact, updateContact, updateRelationship } = useContact(
    contactId || '',
    isEditing
  );
  const { createContactAsync, isCreating } = useContacts();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tier, setTier] = useState<'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL'>('ACQUAINTANCES');
  const [relationshipType, setRelationshipType] = useState<'FAMILY' | 'FRIEND' | 'COLLEAGUE' | 'ROMANTIC' | 'OTHER'>(
    'OTHER'
  );

  // Get available tiers based on relationship type
  const availableTiers = TIERS_BY_TYPE[relationshipType];

  // Reset tier to first available when relationship type changes
  const handleRelationshipTypeChange = (newType: string) => {
    const type = newType as typeof relationshipType;
    setRelationshipType(type);
    // Set tier to the first available tier for this relationship type
    const newTiers = TIERS_BY_TYPE[type];
    if (newTiers.length > 0 && !newTiers.some(t => t.value === tier)) {
      setTier(newTiers[0].value as typeof tier);
    }
  };
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Birthday and important dates
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [anniversary, setAnniversary] = useState<Date | null>(null);
  const [showAnniversaryPicker, setShowAnniversaryPicker] = useState(false);
  const [importantEvents, setImportantEvents] = useState<{ name: string; date: Date }[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState<Date>(new Date());
  const [showNewEventDatePicker, setShowNewEventDatePicker] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone || '');
      setEmail(contact.email || '');
      setNotes(contact.notes || '');
      setBio(contact.bio || '');
      setProfileImage(contact.profileImage || null);
      setBirthday(contact.birthday ? new Date(contact.birthday) : null);
      setAnniversary(contact.anniversary ? new Date(contact.anniversary) : null);
      // importantEvents may come from the API as extra data
      const contactAny = contact as any;
      if (contactAny.importantEvents) {
        setImportantEvents(
          contactAny.importantEvents.map((e: any) => ({
            name: e.name,
            date: new Date(e.date),
          }))
        );
      }
      if (contact.relationship) {
        setTier(contact.relationship.tier as typeof tier);
        setRelationshipType(contact.relationship.relationshipType as typeof relationshipType);
        setSharedInterests(contact.relationship.sharedInterests || []);
      }
    }
  }, [contact]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || 'image/jpeg';
        setProfileImage(`data:${mimeType};base64,${asset.base64}`);
      } else if (asset.uri) {
        setProfileImage(asset.uri);
      }
    }
  };

  const removeImage = () => {
    setProfileImage(null);
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !sharedInterests.includes(newInterest.trim())) {
      setSharedInterests([...sharedInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setSharedInterests(sharedInterests.filter((i) => i !== interest));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleAddImportantEvent = () => {
    if (newEventName.trim()) {
      setImportantEvents([...importantEvents, { name: newEventName.trim(), date: newEventDate }]);
      setNewEventName('');
      setNewEventDate(new Date());
      setShowEventDialog(false);
    }
  };

  const handleRemoveImportantEvent = (index: number) => {
    setImportantEvents(importantEvents.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && contactId) {
        // Update existing contact
        await updateContact({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          bio: bio.trim() || undefined,
          profileImage: profileImage || undefined,
          notes: notes.trim() || undefined,
          birthday: birthday?.toISOString() || undefined,
          anniversary: anniversary?.toISOString() || undefined,
          importantEvents: importantEvents.length > 0 
            ? importantEvents.map(e => ({ name: e.name, date: e.date.toISOString() }))
            : undefined,
        });

        // Update relationship
        await updateRelationship({
          tier,
          relationshipType,
          sharedInterests: sharedInterests.length > 0 ? sharedInterests : undefined,
        });

        Alert.alert('Success', 'Contact updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new contact
        const contactData: CreateContactData = {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          bio: bio.trim() || undefined,
          profileImage: profileImage || undefined,
          notes: notes.trim() || undefined,
          birthday: birthday?.toISOString() || undefined,
          anniversary: anniversary?.toISOString() || undefined,
          importantEvents: importantEvents.length > 0 
            ? importantEvents.map(e => ({ name: e.name, date: e.date.toISOString() }))
            : undefined,
          importSource: 'MANUAL',
        };

        const newContact = await createContactAsync(contactData);

        // Update the relationship with user-selected tier, type, and interests
        try {
          await contactService.updateRelationship(newContact.id, {
            tier,
            relationshipType,
            sharedInterests: sharedInterests.length > 0 ? sharedInterests : undefined,
          });
        } catch (relError) {
          console.warn('Failed to update relationship after creation:', relError);
        }

        // Navigate directly to the new contact's detail screen
        navigation.replace('ContactDetail', { id: newContact.id });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact. Please try again.');
      console.error('Save contact error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && loadingContact) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading contact...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={32} color={colors.textSecondary} />
                <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          {profileImage && (
            <TouchableOpacity onPress={removeImage} style={styles.removePhotoButton}>
              <Text style={styles.removePhotoText}>Remove Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          label="Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Bio"
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={3}
          maxLength={500}
          placeholder="A short bio about this contact..."
          style={styles.input}
          right={<TextInput.Affix text={`${bio.length}/500`} />}
        />

        {/* Important Dates Section */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Important Dates
        </Text>
        
        {/* Birthday */}
        <TouchableOpacity 
          style={styles.dateRow}
          onPress={() => setShowBirthdayPicker(true)}
        >
          <View style={styles.dateInfo}>
            <Ionicons name="gift-outline" size={20} color="#5856D6" />
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateLabel}>Birthday</Text>
              <Text style={styles.dateValue}>{formatDate(birthday)}</Text>
            </View>
          </View>
          <View style={styles.dateActions}>
            {birthday && (
              <IconButton
                icon="close"
                size={18}
                onPress={() => setBirthday(null)}
              />
            )}
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        {/* Anniversary - Only show for ROMANTIC relationships */}
        {relationshipType === 'ROMANTIC' && (
          <TouchableOpacity 
            style={styles.dateRow}
            onPress={() => setShowAnniversaryPicker(true)}
          >
            <View style={styles.dateInfo}>
              <Ionicons name="heart-outline" size={20} color="#FF6B6B" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateLabel}>Anniversary</Text>
                <Text style={styles.dateValue}>{formatDate(anniversary)}</Text>
              </View>
            </View>
            <View style={styles.dateActions}>
              {anniversary && (
                <IconButton
                  icon="close"
                  size={18}
                  onPress={() => setAnniversary(null)}
                />
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {/* Important Events */}
        <View style={styles.importantEventsSection}>
          <View style={styles.importantEventsHeader}>
            <Text style={styles.importantEventsTitle}>Other Important Events</Text>
            <Button mode="text" onPress={() => setShowEventDialog(true)} compact>
              + Add
            </Button>
          </View>
          {importantEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No important events added</Text>
          ) : (
            importantEvents.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <View style={styles.eventItemText}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                </View>
                <IconButton
                  icon="close"
                  size={18}
                  onPress={() => handleRemoveImportantEvent(index)}
                />
              </View>
            ))
          )}
        </View>

        {/* Date Pickers - Year → Month → Day calendar */}
        <CalendarPicker
          visible={showBirthdayPicker}
          value={birthday || new Date(2000, 0, 1)}
          title="Select Birthday"
          maximumDate={new Date()}
          onConfirm={(date) => {
            setBirthday(date);
            setShowBirthdayPicker(false);
          }}
          onCancel={() => setShowBirthdayPicker(false)}
        />
        <CalendarPicker
          visible={showAnniversaryPicker}
          value={anniversary || new Date()}
          title="Select Anniversary"
          maximumDate={new Date()}
          onConfirm={(date) => {
            setAnniversary(date);
            setShowAnniversaryPicker(false);
          }}
          onCancel={() => setShowAnniversaryPicker(false)}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Relationship Type
        </Text>
        <SegmentedButtons
          value={relationshipType}
          onValueChange={handleRelationshipTypeChange}
          buttons={RELATIONSHIP_TYPES.map((t) => ({
            value: t,
            label: t,
          }))}
          style={styles.segmentedButtons}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Closeness Level
        </Text>
        <SegmentedButtons
          value={tier}
          onValueChange={(value) => setTier(value as typeof tier)}
          buttons={availableTiers}
          style={styles.segmentedButtons}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Shared Interests
        </Text>
        <View style={styles.interestsInput}>
          <TextInput
            label="Add interest"
            value={newInterest}
            onChangeText={setNewInterest}
            mode="outlined"
            style={styles.interestInput}
            onSubmitEditing={handleAddInterest}
          />
          <Button mode="contained" onPress={handleAddInterest} style={styles.addButton}>
            Add
          </Button>
        </View>
        {sharedInterests.length > 0 && (
          <View style={styles.chipsContainer}>
            {sharedInterests.map((interest, index) => (
              <Chip key={index} onClose={() => handleRemoveInterest(interest)} style={styles.chip}>
                {interest}
              </Chip>
            ))}
          </View>
        )}

        <TextInput
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !name.trim()}
          style={styles.saveButton}
        >
          {isEditing ? 'Update Contact' : 'Create Contact'}
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton}>
          Cancel
        </Button>
      </View>

      {/* Add Important Event Dialog */}
      <Portal>
        <Dialog visible={showEventDialog} onDismiss={() => setShowEventDialog(false)}>
          <Dialog.Title>Add Important Event</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Event Name"
              value={newEventName}
              onChangeText={setNewEventName}
              mode="outlined"
              placeholder="e.g., Graduation, Wedding Anniversary"
              style={{ marginBottom: 16 }}
            />
            <TouchableOpacity 
              style={styles.dialogDateRow}
              onPress={() => setShowNewEventDatePicker(true)}
            >
              <Text style={styles.dialogDateLabel}>Date:</Text>
              <Text style={styles.dialogDateValue}>{formatDate(newEventDate)}</Text>
            </TouchableOpacity>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEventDialog(false)}>Cancel</Button>
            <Button onPress={handleAddImportantEvent} disabled={!newEventName.trim()}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* New Event Date Picker - Year → Month → Day calendar */}
      <CalendarPicker
        visible={showNewEventDatePicker}
        value={newEventDate}
        title="Select Event Date"
        onConfirm={(date) => {
          setNewEventDate(date);
          setShowNewEventDatePicker(false);
        }}
        onCancel={() => setShowNewEventDatePicker(false)}
      />
    </ScrollView>
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
  content: {
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    ...shadows.light,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  removePhotoButton: {
    marginTop: spacing.sm,
  },
  removePhotoText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  interestsInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  interestInput: {
    flex: 1,
  },
  addButton: {
    alignSelf: 'flex-end',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 32,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateTextContainer: {
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dateValue: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  dateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importantEventsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  importantEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  importantEventsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  noEventsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  eventItemText: {
    flex: 1,
    marginLeft: 10,
  },
  eventName: {
    fontSize: 14,
    color: '#333',
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
  },
  dialogDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dialogDateLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  dialogDateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
