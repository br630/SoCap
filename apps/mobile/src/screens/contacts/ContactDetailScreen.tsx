import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Modal, TouchableOpacity } from 'react-native';
import {
  Avatar,
  Text,
  Button,
  Divider,
  List,
  Card,
  Chip,
  Portal,
  Dialog,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useContact, useInteractionHistory } from '../../hooks/useContact';
import QuickActionButton from '../../components/contacts/QuickActionButton';
import TierBadge from '../../components/contacts/TierBadge';
import InteractionItem from '../../components/contacts/InteractionItem';
import { MessageSuggestionCard, ConversationStarterList } from '../../components/ai';
import { useContactAI } from '../../hooks/useAISuggestions';
import { MessageContext } from '../../services/aiService';

export default function ContactDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = (route.params as { id: string }) || {};
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTab, setAITab] = useState<'messages' | 'starters'>('messages');
  const [messageContext, setMessageContext] = useState<MessageContext>('check-in');
  const [interactionType, setInteractionType] = useState<'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT'>('CALL');
  const [interactionNotes, setInteractionNotes] = useState('');

  const { contact, isLoading, updateRelationship, logInteraction, isLoggingInteraction } = useContact(id);
  const { interactions } = useInteractionHistory(id, 1, 10);
  
  // AI hooks
  const {
    messageSuggestions,
    isLoadingMessages,
    fetchMessageSuggestions,
    conversationStarters,
    isLoadingStarters,
    fetchConversationStarters,
    submitFeedback,
  } = useContactAI(id);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading contact...</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.centerContainer}>
        <Text>Contact not found</Text>
      </View>
    );
  }

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleCall = () => {
    if (contact.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    } else {
      Alert.alert('No phone number', 'This contact does not have a phone number');
    }
  };

  const handleMessage = () => {
    if (contact.phone) {
      Linking.openURL(`sms:${contact.phone}`);
    } else {
      Alert.alert('No phone number', 'This contact does not have a phone number');
    }
  };

  const handleEmail = () => {
    if (contact.email) {
      Linking.openURL(`mailto:${contact.email}`);
    } else {
      Alert.alert('No email', 'This contact does not have an email address');
    }
  };

  const handlePlanEvent = () => {
    navigation.navigate('AddEditEvent' as never, { contactId: id } as never);
  };

  const handleEdit = () => {
    navigation.navigate('AddEditContact' as never, { contactId: id } as never);
  };

  const handleOpenAI = async () => {
    setShowAIModal(true);
    // Fetch message suggestions when opening
    try {
      await fetchMessageSuggestions(messageContext);
    } catch (error) {
      console.log('Error fetching suggestions:', error);
    }
  };

  const handleRefreshMessages = async () => {
    try {
      await fetchMessageSuggestions(messageContext);
    } catch (error) {
      console.log('Error refreshing messages:', error);
    }
  };

  const handleRefreshStarters = async () => {
    try {
      await fetchConversationStarters();
    } catch (error) {
      console.log('Error refreshing starters:', error);
    }
  };

  const handleFeedback = (insightId: string, wasUsed: boolean, feedback?: string) => {
    if (insightId) {
      submitFeedback({ insightId, wasUsed, feedback });
    }
  };

  const handleLogInteraction = () => {
    logInteraction({
      type: interactionType,
      date: new Date().toISOString(),
      notes: interactionNotes || undefined,
    });
    setShowInteractionDialog(false);
    setInteractionNotes('');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Image
            size={100}
            source={contact.profileImage ? { uri: contact.profileImage } : undefined}
            label={!contact.profileImage ? initials : undefined}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {contact.name}
          </Text>
          {contact.relationship && (
            <TierBadge tier={contact.relationship.tier} size="large" />
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickActionButton icon="phone" label="Call" onPress={handleCall} color="#4CAF50" />
        <QuickActionButton icon="message-text" label="Message" onPress={handleMessage} color="#2196F3" />
        <QuickActionButton icon="email" label="Email" onPress={handleEmail} color="#FF9800" />
        <QuickActionButton icon="calendar" label="Event" onPress={handlePlanEvent} color="#9C27B0" />
      </View>

      {/* AI Message Ideas Button */}
      <TouchableOpacity style={styles.aiButton} onPress={handleOpenAI}>
        <Text style={styles.aiButtonIcon}>✨</Text>
        <View style={styles.aiButtonText}>
          <Text style={styles.aiButtonTitle}>Get AI Ideas</Text>
          <Text style={styles.aiButtonSubtitle}>Message suggestions & conversation starters</Text>
        </View>
        <Text style={styles.aiButtonArrow}>›</Text>
      </TouchableOpacity>

      <Divider style={styles.divider} />

      {/* Contact Info */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Contact Information
          </Text>
          {contact.phone && (
            <List.Item
              title="Phone"
              description={contact.phone}
              left={(props) => <List.Icon {...props} icon="phone" />}
            />
          )}
          {contact.email && (
            <List.Item
              title="Email"
              description={contact.email}
              left={(props) => <List.Icon {...props} icon="email" />}
            />
          )}
          {contact.birthday && (
            <List.Item
              title="Birthday"
              description={new Date(contact.birthday).toLocaleDateString()}
              left={(props) => <List.Icon {...props} icon="cake" />}
            />
          )}
          {contact.anniversary && (
            <List.Item
              title="Anniversary"
              description={new Date(contact.anniversary).toLocaleDateString()}
              left={(props) => <List.Icon {...props} icon="heart" />}
            />
          )}
        </Card.Content>
      </Card>

      {/* Relationship Settings */}
      {contact.relationship && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Relationship
              </Text>
              <Button mode="text" onPress={() => setShowRelationshipDialog(true)}>
                Edit
              </Button>
            </View>
            <List.Item
              title="Tier"
              description={contact.relationship.tier.replace('_', ' ')}
              left={(props) => <List.Icon {...props} icon="account-star" />}
            />
            {contact.relationship.customLabel && (
              <List.Item
                title="Custom Label"
                description={contact.relationship.customLabel}
                left={(props) => <List.Icon {...props} icon="label" />}
              />
            )}
            <List.Item
              title="Health Score"
              description={`${contact.relationship.healthScore}/100`}
              left={(props) => <List.Icon {...props} icon="heart-pulse" />}
            />
            {contact.relationship.sharedInterests && contact.relationship.sharedInterests.length > 0 && (
              <View style={styles.interestsContainer}>
                <Text variant="bodyMedium" style={styles.interestsLabel}>
                  Shared Interests:
                </Text>
                <View style={styles.chipsContainer}>
                  {contact.relationship.sharedInterests.map((interest, index) => (
                    <Chip key={index} style={styles.chip}>
                      {interest}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Recent Interactions */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Recent Interactions
            </Text>
            <Button mode="text" onPress={() => setShowInteractionDialog(true)}>
              Log
            </Button>
          </View>
          {interactions.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No interactions yet
            </Text>
          ) : (
            interactions.map((interaction) => (
              <InteractionItem key={interaction.id} interaction={interaction} />
            ))
          )}
        </Card.Content>
      </Card>

      {/* Notes */}
      {contact.notes && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notes
            </Text>
            <Text variant="bodyMedium">{contact.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button mode="contained" onPress={handleEdit} style={styles.actionButton}>
          Edit Contact
        </Button>
      </View>

      {/* Interaction Dialog */}
      <Portal>
        <Dialog visible={showInteractionDialog} onDismiss={() => setShowInteractionDialog(false)}>
          <Dialog.Title>Log Interaction</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={interactionType}
              onValueChange={(value) => setInteractionType(value as any)}
              buttons={[
                { value: 'CALL', label: 'Call' },
                { value: 'TEXT', label: 'Text' },
                { value: 'VIDEO_CALL', label: 'Video' },
                { value: 'IN_PERSON', label: 'In Person' },
                { value: 'EVENT', label: 'Event' },
              ]}
            />
            <TextInput
              label="Notes (optional)"
              value={interactionNotes}
              onChangeText={setInteractionNotes}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowInteractionDialog(false)}>Cancel</Button>
            <Button onPress={handleLogInteraction} loading={isLoggingInteraction}>
              Log
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* AI Modal */}
      <Modal
        visible={showAIModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAIModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✨ AI Ideas for {contact?.name}</Text>
            <TouchableOpacity onPress={() => setShowAIModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, aiTab === 'messages' && styles.tabActive]}
              onPress={() => {
                setAITab('messages');
                if (!messageSuggestions) handleRefreshMessages();
              }}
            >
              <Text style={[styles.tabText, aiTab === 'messages' && styles.tabTextActive]}>
                Messages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, aiTab === 'starters' && styles.tabActive]}
              onPress={() => {
                setAITab('starters');
                if (!conversationStarters) handleRefreshStarters();
              }}
            >
              <Text style={[styles.tabText, aiTab === 'starters' && styles.tabTextActive]}>
                Conversation Starters
              </Text>
            </TouchableOpacity>
          </View>

          {/* Context Selector for Messages */}
          {aiTab === 'messages' && (
            <View style={styles.contextSelector}>
              <Text style={styles.contextLabel}>Context:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['check-in', 'birthday', 'congratulations', 'reconnect', 'thank-you'] as MessageContext[]).map((ctx) => (
                  <TouchableOpacity
                    key={ctx}
                    style={[styles.contextChip, messageContext === ctx && styles.contextChipActive]}
                    onPress={() => {
                      setMessageContext(ctx);
                      fetchMessageSuggestions(ctx);
                    }}
                  >
                    <Text style={[styles.contextChipText, messageContext === ctx && styles.contextChipTextActive]}>
                      {ctx.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView style={styles.modalContent}>
            {aiTab === 'messages' ? (
              <MessageSuggestionCard
                suggestions={messageSuggestions?.suggestions || null}
                contactName={contact?.name}
                isLoading={isLoadingMessages}
                insightId={messageSuggestions?.insightId}
                onFeedback={handleFeedback}
                onRefresh={handleRefreshMessages}
              />
            ) : (
              <ConversationStarterList
                starters={conversationStarters?.starters || null}
                contactName={contact?.name}
                isLoading={isLoadingStarters}
                onRefresh={handleRefreshStarters}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
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
  profileCard: {
    margin: 16,
    marginBottom: 8,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    marginBottom: 8,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-around',
  },
  divider: {
    marginVertical: 8,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  interestsContainer: {
    marginTop: 8,
  },
  interestsLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.5,
    textAlign: 'center',
    padding: 16,
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    marginBottom: 8,
  },
  input: {
    marginTop: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#7C4DFF20',
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
    color: '#7C4DFF',
  },
  aiButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  aiButtonArrow: {
    fontSize: 24,
    color: '#7C4DFF',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#7C4DFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#7C4DFF',
    fontWeight: '600',
  },
  contextSelector: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contextLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  contextChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  contextChipActive: {
    backgroundColor: '#7C4DFF',
  },
  contextChipText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  contextChipTextActive: {
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});
