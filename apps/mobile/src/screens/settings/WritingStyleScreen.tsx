import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  SegmentedButtons,
  ProgressBar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radii, shadows, typography } from '../../theme/paperTheme';

const WRITING_STYLES_KEY = '@writing_styles_v2';

type StyleType = 'close' | 'casual' | 'professional';

interface PromptResponse {
  promptId: string;
  styleType: StyleType;
  prompt: string;
  response: string;
  savedAt: string;
}

interface PromptDefinition {
  id: string;
  scenario: string;
  context: string;
}

const PROMPTS: Record<StyleType, PromptDefinition[]> = {
  close: [
    {
      id: 'close_1',
      scenario: 'Celebrating good news',
      context:
        'Your best friend just texted you that they got the job they\'ve been interviewing for all month. Write your response — react how you naturally would, including any emojis, slang, or voice notes you\'d normally use.',
    },
    {
      id: 'close_2',
      scenario: 'Checking in & making plans',
      context:
        'You haven\'t talked to your closest friend or sibling in about two weeks. You miss them and want to catch up and make plans to hang out this weekend. Write the message you\'d send to get the conversation going.',
    },
    {
      id: 'close_3',
      scenario: 'Comforting someone you love',
      context:
        'Someone very close to you (partner, best friend, or family member) just told you they\'re having a really rough week — work stress, personal issues, all of it. Write how you\'d respond to comfort and support them.',
    },
  ],
  casual: [
    {
      id: 'casual_1',
      scenario: 'Reconnecting with someone',
      context:
        'You bumped into a friend from college at a coffee shop last week and said "we should catch up!" Now you\'re following up. Write the message you\'d send to actually set something up — a coffee, lunch, or hangout.',
    },
    {
      id: 'casual_2',
      scenario: 'Responding to a group chat',
      context:
        'A friend in your group chat just shared photos from an amazing vacation they went on. Everyone\'s been reacting. Write how you\'d naturally respond — your reaction, any follow-up questions, etc.',
    },
    {
      id: 'casual_3',
      scenario: 'Cancelling plans gracefully',
      context:
        'You made plans with a friend for Saturday but something came up and you need to cancel. You still want to hang out another time. Write the message you\'d send — how would you break it to them and suggest rescheduling?',
    },
  ],
  professional: [
    {
      id: 'professional_1',
      scenario: 'Thanking a colleague',
      context:
        'A colleague stayed late to help you prepare for a big presentation that went really well. Write the thank-you message you\'d send them the next day — show your genuine appreciation while keeping it professional.',
    },
    {
      id: 'professional_2',
      scenario: 'Networking follow-up',
      context:
        'You met someone interesting at a professional event last week. They work in a field you\'re curious about and you exchanged numbers. Write your initial follow-up message to explore a potential collaboration or mentorship.',
    },
    {
      id: 'professional_3',
      scenario: 'Following up on a missed deadline',
      context:
        'A team member was supposed to send you their portion of a shared project by yesterday but didn\'t. You need it soon but don\'t want to be harsh. Write how you\'d follow up to get an update on the status.',
    },
  ],
};

const STYLE_META: Record<StyleType, { label: string; icon: string; color: string; description: string }> = {
  close: {
    label: 'Close Friends & Family',
    icon: 'heart',
    color: '#E91E63',
    description: 'How you text the people you\'re closest to — no filter, full personality.',
  },
  casual: {
    label: 'Casual Friends',
    icon: 'people',
    color: colors.primary,
    description: 'How you message regular friends and acquaintances — friendly but not over-the-top.',
  },
  professional: {
    label: 'Professional Contacts',
    icon: 'briefcase',
    color: colors.secondary,
    description: 'How you communicate with colleagues, clients, or business contacts.',
  },
};

export default function WritingStyleScreen() {
  const [responses, setResponses] = useState<PromptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<StyleType>('close');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    loadResponses();
  }, []);

  // When switching type or after saving, jump to the first unanswered prompt
  useEffect(() => {
    const prompts = PROMPTS[selectedType];
    const answered = responses.filter((r) => r.styleType === selectedType);
    const answeredIds = new Set(answered.map((r) => r.promptId));
    const firstUnanswered = prompts.findIndex((p) => !answeredIds.has(p.id));
    setCurrentPromptIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    // Load existing draft for the current prompt
    const currentPrompt = prompts[firstUnanswered >= 0 ? firstUnanswered : 0];
    const existing = responses.find((r) => r.promptId === currentPrompt.id);
    setDraftText(existing?.response || '');
  }, [selectedType, responses]);

  const loadResponses = async () => {
    try {
      const stored = await AsyncStorage.getItem(WRITING_STYLES_KEY);
      if (stored) {
        setResponses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load writing styles:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveResponse = async () => {
    if (!draftText.trim()) {
      Alert.alert('Empty Response', 'Please write how you\'d respond to this scenario.');
      return;
    }

    if (draftText.trim().length < 20) {
      Alert.alert(
        'A Bit More Detail',
        'Write at least a couple sentences so the AI can really learn your style. The more natural and detailed, the better!'
      );
      return;
    }

    setSaving(true);
    try {
      const prompt = PROMPTS[selectedType][currentPromptIndex];
      const newResponse: PromptResponse = {
        promptId: prompt.id,
        styleType: selectedType,
        prompt: prompt.context,
        response: draftText.trim(),
        savedAt: new Date().toISOString(),
      };

      // Replace existing response for this prompt or add new
      const filtered = responses.filter((r) => r.promptId !== prompt.id);
      const updated = [...filtered, newResponse];

      await AsyncStorage.setItem(WRITING_STYLES_KEY, JSON.stringify(updated));
      setResponses(updated);
      setDraftText('');

      // Check if all prompts for this type are answered
      const typePrompts = PROMPTS[selectedType];
      const answeredCount = updated.filter((r) => r.styleType === selectedType).length;

      if (answeredCount >= typePrompts.length) {
        Alert.alert(
          'All Done!',
          `You've completed all ${selectedType === 'close' ? 'Close Friends & Family' : selectedType === 'casual' ? 'Casual Friends' : 'Professional'} prompts. The AI now has a great understanding of your style for this category!`,
          [{ text: 'Awesome!' }]
        );
      } else {
        // Move to next unanswered prompt
        const answeredIds = new Set(updated.map((r) => r.promptId));
        const next = typePrompts.findIndex((p) => !answeredIds.has(p.id));
        if (next >= 0) {
          setCurrentPromptIndex(next);
          const existingNext = updated.find((r) => r.promptId === typePrompts[next].id);
          setDraftText(existingNext?.response || '');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save your response. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePromptNavigation = (index: number) => {
    setCurrentPromptIndex(index);
    const prompt = PROMPTS[selectedType][index];
    const existing = responses.find((r) => r.promptId === prompt.id);
    setDraftText(existing?.response || '');
  };

  const getCompletionForType = (type: StyleType): number => {
    const total = PROMPTS[type].length;
    const answered = responses.filter((r) => r.styleType === type).length;
    return answered / total;
  };

  const isPromptAnswered = (promptId: string): boolean => {
    return responses.some((r) => r.promptId === promptId);
  };

  const currentPrompts = PROMPTS[selectedType];
  const currentPrompt = currentPrompts[currentPromptIndex];
  const currentMeta = STYLE_META[selectedType];
  const completionRatio = getCompletionForType(selectedType);
  const answeredCount = responses.filter((r) => r.styleType === selectedType).length;

  if (loading) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <Card style={s.introCard}>
          <Card.Content>
            <View style={s.introHeader}>
              <Ionicons name="sparkles" size={22} color={colors.secondary} />
              <Text style={s.introTitle}>Teach the AI Your Voice</Text>
            </View>
            <Text style={s.introText}>
              Respond to 3 real-life scenarios for each relationship type.
              The AI uses your answers to generate messages that genuinely sound like you.
            </Text>
          </Card.Content>
        </Card>

        {/* Type Selector */}
        <View style={s.typeSelector}>
          <SegmentedButtons
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as StyleType)}
            buttons={[
              { value: 'close', label: '❤️ Close' },
              { value: 'casual', label: '👋 Casual' },
              { value: 'professional', label: '💼 Pro' },
            ]}
          />
        </View>

        {/* Progress for current type */}
        <View style={s.progressSection}>
          <View style={s.progressHeader}>
            <Ionicons name={currentMeta.icon as any} size={18} color={currentMeta.color} />
            <Text style={s.progressLabel}>{currentMeta.label}</Text>
            <Text style={s.progressCount}>
              {answeredCount}/{currentPrompts.length}
            </Text>
          </View>
          <ProgressBar
            progress={completionRatio}
            color={currentMeta.color}
            style={s.progressBar}
          />
          <Text style={s.progressDescription}>{currentMeta.description}</Text>
        </View>

        {/* Prompt Navigation Dots */}
        <View style={s.dotsContainer}>
          {currentPrompts.map((p, i) => {
            const answered = isPromptAnswered(p.id);
            const isActive = i === currentPromptIndex;
            return (
              <View
                key={p.id}
                style={s.dotWrapper}
              >
                <Button
                  mode={isActive ? 'contained' : 'outlined'}
                  compact
                  onPress={() => handlePromptNavigation(i)}
                  style={[
                    s.dotButton,
                    isActive && { backgroundColor: currentMeta.color },
                    answered && !isActive && { borderColor: currentMeta.color },
                  ]}
                  labelStyle={[
                    s.dotLabel,
                    isActive && { color: '#FFFFFF' },
                    answered && !isActive && { color: currentMeta.color },
                  ]}
                >
                  {answered ? `✓ ${i + 1}` : `${i + 1}`}
                </Button>
                <Text style={s.dotScenario} numberOfLines={1}>
                  {p.scenario}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Current Prompt */}
        <Card style={s.promptCard}>
          <Card.Content>
            <View style={s.scenarioHeader}>
              <View style={[s.scenarioBadge, { backgroundColor: currentMeta.color + '18' }]}>
                <Text style={[s.scenarioBadgeText, { color: currentMeta.color }]}>
                  Scenario {currentPromptIndex + 1} of {currentPrompts.length}
                </Text>
              </View>
              <Text style={s.scenarioTitle}>{currentPrompt.scenario}</Text>
            </View>
            <Text style={s.promptText}>{currentPrompt.context}</Text>
          </Card.Content>
        </Card>

        {/* Response Input */}
        <Card style={s.inputCard}>
          <Card.Content>
            <Text style={s.inputLabel}>Your response:</Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={5}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Type exactly how you'd actually send this message..."
              style={s.textInput}
              outlineStyle={{ borderRadius: radii.md, borderColor: colors.border }}
            />
            <View style={s.inputFooter}>
              <Text style={s.charCount}>
                {draftText.length} characters
                {draftText.length > 0 && draftText.length < 20 && ' (minimum 20)'}
              </Text>
              <Button
                mode="contained"
                onPress={saveResponse}
                loading={saving}
                disabled={saving || !draftText.trim()}
                style={[s.saveButton, { backgroundColor: currentMeta.color }]}
                labelStyle={s.saveButtonLabel}
              >
                {isPromptAnswered(currentPrompt.id) ? 'Update Response' : 'Save Response'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Overall Progress */}
        <Card style={s.overallCard}>
          <Card.Content>
            <Text style={s.overallTitle}>Overall Progress</Text>
            {(['close', 'casual', 'professional'] as StyleType[]).map((type) => {
              const meta = STYLE_META[type];
              const answered = responses.filter((r) => r.styleType === type).length;
              const total = PROMPTS[type].length;
              const ratio = answered / total;
              return (
                <View key={type} style={s.overallRow}>
                  <View style={s.overallRowHeader}>
                    <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    <Text style={s.overallRowLabel}>{meta.label}</Text>
                    <Text style={[s.overallRowCount, ratio >= 1 && { color: colors.success }]}>
                      {ratio >= 1 ? '✓ Complete' : `${answered}/${total}`}
                    </Text>
                  </View>
                  <ProgressBar progress={ratio} color={meta.color} style={s.overallRowBar} />
                </View>
              );
            })}
            <Text style={s.overallHint}>
              {responses.length === 9
                ? 'All prompts completed! The AI has a strong understanding of your writing style.'
                : `${9 - responses.length} more response${9 - responses.length === 1 ? '' : 's'} to fully train the AI.`}
            </Text>
          </Card.Content>
        </Card>

        <View style={s.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introCard: {
    margin: spacing.lg,
    backgroundColor: colors.secondary + '12',
    borderRadius: radii.lg,
    ...shadows.subtle,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  introTitle: {
    ...typography.h4,
    color: colors.secondary,
  },
  introText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  typeSelector: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  progressLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  progressCount: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  dotWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  dotButton: {
    borderRadius: radii.md,
    minWidth: 0,
  },
  dotLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dotScenario: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  promptCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF',
    ...shadows.light,
  },
  scenarioHeader: {
    marginBottom: spacing.md,
  },
  scenarioBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  scenarioBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scenarioTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  promptText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  inputCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF',
    ...shadows.light,
  },
  inputLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    marginBottom: spacing.sm,
    maxHeight: 180,
    backgroundColor: colors.surface,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  saveButton: {
    borderRadius: radii.md,
  },
  saveButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overallCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF',
    ...shadows.light,
  },
  overallTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  overallRow: {
    marginBottom: spacing.md,
  },
  overallRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  overallRowLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  overallRowCount: {
    ...typography.captionSmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  overallRowBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  overallHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
});
