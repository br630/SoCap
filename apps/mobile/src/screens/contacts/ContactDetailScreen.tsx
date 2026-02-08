import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, Modal, TouchableOpacity, Platform, Image } from 'react-native';
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
  ActivityIndicator,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useContact, useInteractionHistory } from '../../hooks/useContact';
import TierBadge from '../../components/contacts/TierBadge';
import InteractionItem from '../../components/contacts/InteractionItem';
import { MessageSuggestionCard, ConversationStarterList } from '../../components/ai';
import { InterestUpdatesCard } from '../../components/interests';
import { useContactAI } from '../../hooks/useAISuggestions';
import { MessageContext } from '../../services/aiService';
import { ContactStackParamList } from '../../types/navigation';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

export default function ContactDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<ContactStackParamList>>();
  const { id, openLogDialog } = (route.params as { id: string; openLogDialog?: boolean }) || {};
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  
  useEffect(() => {
    if (openLogDialog) {
      setShowInteractionDialog(true);
    }
  }, [openLogDialog]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTab, setAITab] = useState<'messages' | 'starters'>('messages');
  const [messageContext, setMessageContext] = useState<MessageContext>('check-in');
  const [interactionType, setInteractionType] = useState<'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT'>('CALL');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const INTERACTION_TEMPLATES: Record<string, { type: 'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT'; note: string; label: string; emoji: string }> = {
    quickCall: { type: 'CALL', note: 'Quick catch-up call', label: 'Quick Call', emoji: '📞' },
    longCall: { type: 'CALL', note: 'Long conversation, caught up on life', label: 'Long Chat', emoji: '📱' },
    textCheckin: { type: 'TEXT', note: 'Sent a quick check-in message', label: 'Text Check-in', emoji: '💬' },
    sharedMeme: { type: 'TEXT', note: 'Shared something funny/interesting', label: 'Shared Content', emoji: '😂' },
    videoChat: { type: 'VIDEO_CALL', note: 'Video call catch-up', label: 'Video Chat', emoji: '🎥' },
    coffee: { type: 'IN_PERSON', note: 'Grabbed coffee together', label: 'Coffee', emoji: '☕' },
    lunch: { type: 'IN_PERSON', note: 'Had lunch/dinner together', label: 'Meal', emoji: '🍽️' },
    hangout: { type: 'IN_PERSON', note: 'Hung out together', label: 'Hangout', emoji: '🎉' },
    event: { type: 'EVENT', note: 'Attended an event together', label: 'Event', emoji: '🎭' },
  };

  const handleSelectTemplate = (templateKey: string) => {
    const template = INTERACTION_TEMPLATES[templateKey];
    if (template) {
      setSelectedTemplate(templateKey);
      setInteractionType(template.type);
      setInteractionNotes(template.note);
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setInteractionNotes('');
  };

  const { contact, isLoading, updateRelationship, logInteraction, logInteractionAsync, isLoggingInteraction, deleteContact, isDeleting } = useContact(id);
  const { interactions } = useInteractionHistory(id, 1, 10);
  
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading contact...</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.textSecondary }}>Contact not found</Text>
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
    navigation.navigate('ContactMessages', { 
      contactId: id, 
      contactName: contact.name,
      contactPhone: contact.phone ?? undefined,
    });
  };

  const handleEmail = () => {
    if (contact.email) {
      Linking.openURL(`mailto:${contact.email}`);
    } else {
      Alert.alert('No email', 'This contact does not have an email address');
    }
  };

  const handlePlanEvent = () => {
    navigation.navigate('ContactEvents', { 
      contactId: id, 
      contactName: contact.name,
    });
  };

  const handleEdit = () => {
    navigation.navigate('AddEditContact', { contactId: id });
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      setShowDeleteDialog(true);
    } else {
      Alert.alert(
        'Delete Contact',
        `Are you sure you want to delete ${contact?.name}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    deleteContact(undefined, {
      onSuccess: () => { navigation.goBack(); },
      onError: (error) => {
        if (Platform.OS === 'web') {
          window.alert('Failed to delete contact. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to delete contact. Please try again.');
        }
        console.error('Delete contact error:', error);
      },
    });
  };

  const handleOpenAI = async () => {
    setShowAIModal(true);
    try {
      await fetchMessageSuggestions(messageContext);
    } catch (error) {
      console.log('Error fetching suggestions:', error);
    }
  };

  const handleRefreshMessages = async () => {
    try { await fetchMessageSuggestions(messageContext); } catch (error) { console.log('Error:', error); }
  };

  const handleRefreshStarters = async () => {
    try { await fetchConversationStarters(); } catch (error) { console.log('Error:', error); }
  };

  const handleFeedback = (insightId: string, wasUsed: boolean, feedback?: string) => {
    if (insightId) { submitFeedback({ insightId, wasUsed, feedback }); }
  };

  const handleLogInteraction = async () => {
    try {
      await logInteractionAsync({
        type: interactionType,
        date: new Date().toISOString(),
        notes: interactionNotes || undefined,
      });
      setShowInteractionDialog(false);
      setInteractionNotes('');
      setSelectedTemplate(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Logged!', `Interaction with ${contact?.name} recorded.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to log interaction. Please try again.');
    }
  };

  // Quick action data
  const quickActions = [
    { icon: 'call-outline' as const, label: 'Call', onPress: handleCall },
    { icon: 'chatbubble-outline' as const, label: 'Message', onPress: handleMessage },
    { icon: 'mail-outline' as const, label: 'Email', onPress: handleEmail },
    { icon: 'calendar-outline' as const, label: 'Event', onPress: handlePlanEvent },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header — Large Avatar */}
      <View style={styles.profileSection}>
        <View style={styles.avatarLarge}>
          {contact.profileImage ? (
            <Image source={{ uri: contact.profileImage }} style={styles.avatarLargeImage} />
          ) : (
            <Text style={styles.avatarLargeText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.name}>{contact.name}</Text>
        {contact.relationship && (
          <TierBadge tier={contact.relationship.tier} size="large" />
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.label} style={styles.quickActionItem} onPress={action.onPress} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name={action.icon} size={24} color={colors.textSecondary} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Ideas Button — FAB style */}
      <TouchableOpacity style={styles.aiButton} onPress={handleOpenAI} activeOpacity={0.8}>
        <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        <Text style={styles.aiButtonText}>Get AI Ideas</Text>
      </TouchableOpacity>

      {/* Contact Info — Standard Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {contact.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{contact.phone}</Text>
          </View>
        )}
        {contact.email && (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{contact.email}</Text>
          </View>
        )}
        {contact.relationship && (
          <View style={styles.relationshipRow}>
            <View style={styles.relationshipLeft}>
              <Text style={[styles.tierText, { color: colors.primary }]}>
                {contact.relationship.tier.replace(/_/g, ' ')}
              </Text>
              {contact.birthday && (
                <View style={styles.infoRow}>
                  <Ionicons name="gift-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoTextSmall}>Birthday: {new Date(contact.birthday).toLocaleDateString()}</Text>
                </View>
              )}
              {contact.anniversary && (
                <View style={styles.infoRow}>
                  <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoTextSmall}>Anniversary: {new Date(contact.anniversary).toLocaleDateString()}</Text>
                </View>
              )}
            </View>
            <View style={styles.relationshipRight}>
              <View style={styles.healthScoreRow}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.healthScoreText}>Health Score: {contact.relationship.healthScore}/100</Text>
              </View>
              {contact.relationship.sharedInterests && contact.relationship.sharedInterests.length > 0 && (
                <View style={styles.interestChips}>
                  {contact.relationship.sharedInterests.slice(0, 3).map((interest, index) => (
                    <View key={index} style={styles.interestChip}>
                      <Text style={styles.interestChipText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Interest Updates */}
      {contact?.relationship?.sharedInterests && contact.relationship.sharedInterests.length > 0 && (
        <InterestUpdatesCard contactId={id} contactName={contact.name} />
      )}

      {/* Recent Interactions */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Interactions</Text>
          <TouchableOpacity 
            style={styles.logButton}
            onPress={() => setShowInteractionDialog(true)}
          >
            <Text style={styles.logButtonText}>+ Log Interaction</Text>
          </TouchableOpacity>
        </View>
        {interactions.length === 0 ? (
          <Text style={styles.emptyText}>No interactions yet</Text>
        ) : (
          interactions.map((interaction) => (
            <InteractionItem key={interaction.id} interaction={interaction} />
          ))
        )}
      </View>

      {/* Notes */}
      {contact.notes && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{contact.notes}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit} activeOpacity={0.8}>
          <Text style={styles.editButtonText}>Edit Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
          <Text style={styles.deleteButtonText}>Delete Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Interaction Dialog */}
      <Portal>
        <Dialog visible={showInteractionDialog} onDismiss={() => setShowInteractionDialog(false)} style={styles.wideDialog}>
          <Dialog.Title>Log Interaction</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.templateLabel}>Quick Log:</Text>
            <View style={styles.templatesGrid}>
              {Object.entries(INTERACTION_TEMPLATES).map(([key, template]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.templateButton, selectedTemplate === key && styles.templateButtonActive]}
                  onPress={() => handleSelectTemplate(key)}
                >
                  <Text style={styles.templateEmoji}>{template.emoji}</Text>
                  <Text style={[styles.templateText, selectedTemplate === key && styles.templateTextActive]}>
                    {template.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Divider style={styles.templateDivider} />
            <Text style={styles.templateLabel}>Or customize:</Text>
            <SegmentedButtons
              value={interactionType}
              onValueChange={(value) => { setInteractionType(value as any); setSelectedTemplate(null); }}
              buttons={[
                { value: 'CALL', label: 'Call' },
                { value: 'TEXT', label: 'Text' },
                { value: 'VIDEO_CALL', label: 'Video' },
                { value: 'IN_PERSON', label: 'Meet' },
                { value: 'EVENT', label: 'Event' },
              ]}
              style={styles.segmentedButtonsSmall}
            />
            <TextInput
              label="Notes (optional)"
              value={interactionNotes}
              onChangeText={(text) => { setInteractionNotes(text); if (selectedTemplate) setSelectedTemplate(null); }}
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setShowInteractionDialog(false); handleClearTemplate(); }}>Cancel</Button>
            <Button onPress={handleLogInteraction} loading={isLoggingInteraction}>Log</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Contact</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete {contact?.name}? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={confirmDelete} textColor={colors.error} loading={isDeleting}>Delete</Button>
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
            <Text style={styles.modalTitle}>AI Ideas for {contact?.name}</Text>
            <TouchableOpacity onPress={() => setShowAIModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, aiTab === 'messages' && styles.tabActive]}
              onPress={() => { setAITab('messages'); if (!messageSuggestions) handleRefreshMessages(); }}
            >
              <Text style={[styles.tabText, aiTab === 'messages' && styles.tabTextActive]}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, aiTab === 'starters' && styles.tabActive]}
              onPress={() => { setAITab('starters'); if (!conversationStarters) handleRefreshStarters(); }}
            >
              <Text style={[styles.tabText, aiTab === 'starters' && styles.tabTextActive]}>Conversation Starters</Text>
            </TouchableOpacity>
          </View>
          {aiTab === 'messages' && (
            <View style={styles.contextSelector}>
              <Text style={styles.contextLabel}>Context:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['check-in', 'birthday', 'congratulations', 'reconnect', 'thank-you'] as MessageContext[]).map((ctx) => (
                  <TouchableOpacity
                    key={ctx}
                    style={[styles.contextChip, messageContext === ctx && styles.contextChipActive]}
                    onPress={() => { setMessageContext(ctx); fetchMessageSuggestions(ctx); }}
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
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  // Large Avatar: 80px, full radius, Surface bg, 3px white border, light shadow
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.light,
  },
  avatarLargeImage: { width: '100%', height: '100%', borderRadius: radii.full },
  avatarLargeText: { color: colors.textSecondary, fontSize: 28, fontWeight: '600' },
  name: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  quickActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickActionItem: { alignItems: 'center', width: 64 },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.light,
  },
  quickActionLabel: { ...typography.captionSmall, color: colors.textSecondary },
  // AI Button — secondary color, full radius
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    marginHorizontal: spacing['3xl'],
    height: 50,
    borderRadius: radii.full,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  aiButtonText: { color: '#FFFFFF', ...typography.h5 },
  // Standard Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.light,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h5, color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoText: { ...typography.bodySmall, color: colors.textPrimary },
  infoTextSmall: { ...typography.caption, color: colors.textSecondary },
  relationshipRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg },
  relationshipLeft: { flex: 1 },
  relationshipRight: { flex: 1, alignItems: 'flex-end' },
  tierText: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.sm },
  healthScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  healthScoreText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
  interestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  interestChip: { backgroundColor: colors.surface, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  interestChipText: { ...typography.overline, color: colors.textSecondary },
  logButton: { backgroundColor: colors.primary + '15', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md },
  logButtonText: { ...typography.caption, fontWeight: '600', color: colors.primary },
  emptyText: { textAlign: 'center', color: colors.textSecondary, padding: spacing.lg },
  notesText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },
  // Action buttons — Primary & Destructive
  actions: { flexDirection: 'row', padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.light,
  },
  editButtonText: { color: '#FFFFFF', ...typography.h5 },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.error + '15',
    height: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { color: colors.error, fontSize: 17, fontWeight: '600' },
  input: { marginTop: spacing.lg },
  wideDialog: { maxWidth: 500, alignSelf: 'center', width: '95%' },
  templateLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  templatesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateButtonActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  templateEmoji: { fontSize: 16, marginRight: spacing.sm },
  templateText: { ...typography.caption, color: colors.textSecondary },
  templateTextActive: { color: colors.primary, fontWeight: '600' },
  templateDivider: { marginVertical: spacing.md },
  segmentedButtonsSmall: { marginBottom: spacing.md },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h4, color: colors.textPrimary },
  modalClose: { ...typography.body, color: colors.primary, fontWeight: '600' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  contextSelector: { backgroundColor: '#FFFFFF', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  contextLabel: { ...typography.captionSmall, color: colors.textSecondary, marginBottom: spacing.sm },
  contextChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: colors.surface, marginRight: spacing.sm },
  contextChipActive: { backgroundColor: colors.primary },
  contextChipText: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  contextChipTextActive: { color: '#FFFFFF' },
  modalContent: { flex: 1, padding: spacing.lg },
});
