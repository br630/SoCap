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
import { Text, Card, Button, IconButton, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useContactAI } from '../../hooks/useAISuggestions';
import { MessageSuggestionCard } from '../../components/ai';
import { MessageContext } from '../../services/aiService';

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
    { value: 'congratulations', label: 'Congrats', icon: 'party-popper' },
    { value: 'thank-you', label: 'Thank You', icon: 'hand-heart' },
    { value: 'reconnect', label: 'Reconnect', icon: 'account-clock' },
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
      // Remove non-numeric characters for WhatsApp
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
    // Fetch initial suggestions
    fetchMessageSuggestions(selectedContext);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Context Selector */}
        <Text style={styles.sectionTitle}>What's the occasion?</Text>
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
                color={selectedContext === ctx.value ? '#7C4DFF' : '#666'}
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
          <Text style={styles.sectionTitle}>✨ AI Suggestions for {contactName}</Text>
          <MessageSuggestionCard
            suggestions={messageSuggestions?.suggestions || null}
            contactName={contactName}
            isLoading={isLoadingMessages}
            insightId={messageSuggestions?.insightId}
            onFeedback={handleFeedback}
            onRefresh={() => fetchMessageSuggestions(selectedContext)}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Compose Message */}
        <Text style={styles.sectionTitle}>Compose Your Message</Text>
        <Card style={styles.composeCard}>
          <Card.Content>
            <RNTextInput
              style={styles.messageInput}
              placeholder={`Write a message to ${contactName}...`}
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </Card.Content>
        </Card>

        {/* Send Options */}
        <Text style={styles.sectionTitle}>Send Via</Text>
        <View style={styles.sendOptions}>
          <TouchableOpacity style={styles.sendOption} onPress={handleSendViaSMS}>
            <View style={[styles.sendIconContainer, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="chatbubble" size={24} color="#fff" />
            </View>
            <Text style={styles.sendOptionLabel}>SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendOption} onPress={handleSendViaWhatsApp}>
            <View style={[styles.sendIconContainer, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </View>
            <Text style={styles.sendOptionLabel}>WhatsApp</Text>
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
            <Text style={styles.sendOptionLabel}>Telegram</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sendOption}
            onPress={() => {
              // Copy to clipboard for other apps
              Alert.alert(
                'Copy Message',
                'Message copied! You can now paste it in any messaging app.',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={[styles.sendIconContainer, { backgroundColor: '#666' }]}>
              <Ionicons name="copy" size={24} color="#fff" />
            </View>
            <Text style={styles.sendOptionLabel}>Copy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  contextsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  contextCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 10,
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  contextCardActive: {
    borderColor: '#7C4DFF',
    backgroundColor: '#F3E5FF',
  },
  contextLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  contextLabelActive: {
    color: '#7C4DFF',
    fontWeight: '600',
  },
  suggestionsSection: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  composeCard: {
    marginHorizontal: 16,
    borderRadius: 12,
  },
  messageInput: {
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
    padding: 0,
  },
  sendOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sendOption: {
    alignItems: 'center',
  },
  sendIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sendOptionLabel: {
    fontSize: 12,
    color: '#666',
  },
});
