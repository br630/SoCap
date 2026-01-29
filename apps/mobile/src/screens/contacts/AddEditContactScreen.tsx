import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  SegmentedButtons,
  Chip,
  Portal,
  Dialog,
  ActivityIndicator,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useContact } from '../../hooks/useContact';
import { useContacts } from '../../hooks/useContacts';
import { CreateContactData, UpdateContactData } from '../../services/contactService';

const TIERS = ['INNER_CIRCLE', 'CLOSE_FRIENDS', 'FRIENDS', 'ACQUAINTANCES', 'PROFESSIONAL'] as const;
const RELATIONSHIP_TYPES = ['FAMILY', 'FRIEND', 'COLLEAGUE', 'ROMANTIC', 'OTHER'] as const;

export default function AddEditContactScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { contactId } = (route.params as { contactId?: string }) || {};
  const isEditing = !!contactId;

  const { contact, isLoading: loadingContact, updateContact, updateRelationship } = useContact(
    contactId || '',
    isEditing
  );
  const { createContact, isCreating } = useContacts();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [tier, setTier] = useState<'INNER_CIRCLE' | 'CLOSE_FRIENDS' | 'FRIENDS' | 'ACQUAINTANCES' | 'PROFESSIONAL'>(
    'ACQUAINTANCES'
  );
  const [relationshipType, setRelationshipType] = useState<'FAMILY' | 'FRIEND' | 'COLLEAGUE' | 'ROMANTIC' | 'OTHER'>(
    'OTHER'
  );
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone || '');
      setEmail(contact.email || '');
      setNotes(contact.notes || '');
      if (contact.relationship) {
        setTier(contact.relationship.tier);
        setRelationshipType(contact.relationship.relationshipType);
        setSharedInterests(contact.relationship.sharedInterests || []);
      }
    }
  }, [contact]);

  const handleAddInterest = () => {
    if (newInterest.trim() && !sharedInterests.includes(newInterest.trim())) {
      setSharedInterests([...sharedInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setSharedInterests(sharedInterests.filter((i) => i !== interest));
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
          notes: notes.trim() || undefined,
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
          notes: notes.trim() || undefined,
          importSource: 'MANUAL',
        };

        await createContact(contactData);

        Alert.alert('Success', 'Contact created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
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

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Relationship Tier
        </Text>
        <SegmentedButtons
          value={tier}
          onValueChange={(value) => setTier(value as any)}
          buttons={TIERS.map((t) => ({
            value: t,
            label: t.replace('_', ' '),
          }))}
          style={styles.segmentedButtons}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Relationship Type
        </Text>
        <SegmentedButtons
          value={relationshipType}
          onValueChange={(value) => setRelationshipType(value as any)}
          buttons={RELATIONSHIP_TYPES.map((t) => ({
            value: t,
            label: t,
          }))}
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
          loading={saving || isCreating}
          disabled={saving || isCreating || !name.trim()}
          style={styles.saveButton}
        >
          {isEditing ? 'Update Contact' : 'Create Contact'}
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton}>
          Cancel
        </Button>
      </View>
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
});
