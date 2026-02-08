import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useContactAI } from '../../hooks/useAISuggestions';
import { MessageSuggestionCard } from '../../components/ai';
import { MessageContext } from '../../services/aiService';
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';

export default function ContactMessagesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { contactId, contactName, contactPhone } = (route.params as {
    contactId: string;
    contactName: string;
    contactPhone?: string;
  }) || {};

  const [messageText, setMessageText] = useState('');
  const [selectedContext, setSelectedContext] = useState<MessageContext>('check-in');

  const {
    messageSuggestions,
    isLoadingMessages,
    fetchMessageSuggestions,
    submitFeedback,
  } = useContactAI(contactId);

  const contexts: { value: MessageContext; label: string; icon: string }[] = [
    { value: 'check-in', label: 'Check In', icon: 'hand-wave' },
    { value: 'birthday', label: 'Birthday', icon: 'cake-variant' },
    { value: 'thank-you', label: 'Thank You', icon: 'hand-heart' },
    { value: 'sympathy', label: 'Sympathy', icon: 'flower' },
    { value: 'holiday', label: 'Holiday', icon: 'pine-tree' },
    { value: 'event-invite', label: 'Event Invite', icon: 'calendar-plus' },
  ];

  const handleContextChange = async (context: MessageContext) => {
    setSelectedContext(context);
    try {
      await fetchMessageSuggestions(context);
    } catch (error) {
      console.log('Error fetching suggestions:', error);
    }
  };

  const handleSendViaSMS = () => {
    if (!messageText.trim()) {
      Alert.alert('Empty Message', 'Please enter a message first');
      return;
    }
    if (contactPhone) {
      Linking.openURL(`sms:${contactPhone}?body=${encodeURIComponent(messageText)}`);
    } else {
      Alert.alert('No Phone Number', 'This contact does not have a phone number');
    }
  };

  const handleSendViaWhatsApp = () => {
    if (!messageText.trim()) {
      Alert.alert('Empty Message', 'Please enter a message first');
      return;
    }
    if (contactPhone) {
      const cleanPhone = contactPhone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`);
    } else {
      Alert.alert('No Phone Number', 'This contact does not have a phone number for WhatsApp');
    }
  };

  const handleFeedback = (insightId: string, wasUsed: boolean, feedback?: string) => {
    if (insightId) {
      submitFeedback({ insightId, wasUsed, feedback });
    }
  };

  React.useEffect(() => {
    fetchMessageSuggestions(selectedContext);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Context Selector */}
        <Text style={styles.sectionLabel}>Context</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contextsContainer}
        >
          {contexts.map((ctx) => (
            <TouchableOpacity
              key={ctx.value}
              style={[
                styles.contextCard,
                selectedContext === ctx.value && styles.contextCardActive,
              ]}
              onPress={() => handleContextChange(ctx.value)}
            >
              <MaterialCommunityIcons
                name={ctx.icon as any}
                size={24}
                color={selectedContext === ctx.value ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.contextLabel,
                  selectedContext === ctx.value && styles.contextLabelActive,
                ]}
              >
                {ctx.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI Suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionLabel}>AI Suggestions</Text>
          <MessageSuggestionCard
            suggestions={messageSuggestions?.suggestions || null}
            contactName={contactName}
            isLoading={isLoadingMessages}
            insightId={messageSuggestions?.insightId}
            onFeedback={handleFeedback}
            onRefresh={() => fetchMessageSuggestions(selectedContext)}
          />
        </View>

        {/* Compose Message — Standard Card */}
        <View style={styles.composeCard}>
          <RNTextInput
            style={styles.messageInput}
            placeholder="Type your message..."
            placeholderTextColor={colors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Send Options — FAB-sized icons */}
        <View style={styles.sendOptions}>
          <TouchableOpacity style={styles.sendOption} onPress={handleSendViaSMS}>
            <View style={[styles.sendIconContainer, { backgroundColor: colors.primary }]}>
              <Text style={styles.sendIconText}>SMS</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendOption} onPress={handleSendViaWhatsApp}>
            <View style={[styles.sendIconContainer, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sendOption}
            onPress={() => {
              if (messageText.trim()) {
                Linking.openURL(`https://t.me/?text=${encodeURIComponent(messageText)}`);
              }
            }}
          >
            <View style={[styles.sendIconContainer, { backgroundColor: '#0088cc' }]}>
              <Ionicons name="paper-plane" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sendOption}
            onPress={() => {
              Alert.alert('Copy Message', 'Message copied! You can now paste it in any messaging app.', [{ text: 'OK' }]);
            }}
          >
            <View style={[styles.sendIconContainer, { backgroundColor: colors.textSecondary }]}>
              <Text style={styles.sendIconText}>Copy</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendOption}>
            <View style={[styles.sendIconContainer, { backgroundColor: colors.textSecondary }]}>
              <Ionicons name="document-text-outline" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.h5,
    color: colors.textPrimary,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  contextsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  contextCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    minWidth: 76,
    ...shadows.light,
  },
  contextCardActive: {
    backgroundColor: colors.primary,
  },
  contextLabel: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  contextLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  suggestionsSection: {
    marginTop: spacing.sm,
  },
  composeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.light,
  },
  messageInput: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    minHeight: 100,
    padding: 0,
  },
  sendOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  sendOption: {
    alignItems: 'center',
  },
  sendIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.light,
  },
  sendIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
