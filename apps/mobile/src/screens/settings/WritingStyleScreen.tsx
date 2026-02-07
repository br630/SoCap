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
  IconButton,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WRITING_STYLES_KEY = '@writing_styles';

interface WritingStyle {
  id: string;
  type: 'close' | 'casual' | 'professional';
  sample: string;
  createdAt: string;
}

const STYLE_TYPES = [
  { 
    value: 'close', 
    label: 'Close Friends/Family',
    description: 'How you text your best friends, siblings, or partner',
    placeholder: "e.g., 'yo what's good! you free this weekend? we should definitely hang, been too long 😂'",
  },
  { 
    value: 'casual', 
    label: 'Casual Friends',
    description: 'How you message regular friends or acquaintances',
    placeholder: "e.g., 'Hey! Hope you're doing well. Wanted to see if you'd be interested in grabbing coffee sometime?'",
  },
  { 
    value: 'professional', 
    label: 'Professional',
    description: 'How you communicate with colleagues or business contacts',
    placeholder: "e.g., 'Hi John, I hope this message finds you well. I wanted to follow up on our conversation last week...'",
  },
];

export default function WritingStyleScreen() {
  const [styles, setStyles] = useState<WritingStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<'close' | 'casual' | 'professional'>('close');
  const [currentSample, setCurrentSample] = useState('');

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      const stored = await AsyncStorage.getItem(WRITING_STYLES_KEY);
      if (stored) {
        setStyles(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load writing styles:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStyles = async (newStyles: WritingStyle[]) => {
    try {
      await AsyncStorage.setItem(WRITING_STYLES_KEY, JSON.stringify(newStyles));
      setStyles(newStyles);
    } catch (error) {
      console.error('Failed to save writing styles:', error);
      Alert.alert('Error', 'Failed to save writing style');
    }
  };

  const handleAddSample = async () => {
    if (!currentSample.trim()) {
      Alert.alert('Empty Sample', 'Please write a sample message first');
      return;
    }

    if (currentSample.trim().length < 20) {
      Alert.alert('Too Short', 'Please write a longer sample (at least 20 characters) to help the AI understand your style');
      return;
    }

    setSaving(true);
    try {
      const newStyle: WritingStyle = {
        id: Date.now().toString(),
        type: selectedType,
        sample: currentSample.trim(),
        createdAt: new Date().toISOString(),
      };

      const newStyles = [...styles, newStyle];
      await saveStyles(newStyles);
      setCurrentSample('');
      Alert.alert('Success', 'Writing sample added! The AI will learn from your style.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSample = (id: string) => {
    Alert.alert(
      'Delete Sample',
      'Are you sure you want to delete this writing sample?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const newStyles = styles.filter(s => s.id !== id);
            await saveStyles(newStyles);
          },
        },
      ]
    );
  };

  const getStylesByType = (type: string) => styles.filter(s => s.type === type);
  const currentTypeInfo = STYLE_TYPES.find(t => t.value === selectedType)!;

  if (loading) {
    return (
      <View style={componentStyles.centerContainer}>
        <ActivityIndicator size="large" color="#7C4DFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={componentStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <Card style={componentStyles.introCard}>
          <Card.Content>
            <View style={componentStyles.introHeader}>
              <Ionicons name="sparkles" size={24} color="#7C4DFF" />
              <Text style={componentStyles.introTitle}>Teach the AI Your Style</Text>
            </View>
            <Text style={componentStyles.introText}>
              Add sample messages that show how you typically write to different people. 
              The AI will learn your unique voice and generate suggestions that sound like you!
            </Text>
          </Card.Content>
        </Card>

        {/* Type Selector */}
        <View style={componentStyles.typeSelector}>
          <SegmentedButtons
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as any)}
            buttons={[
              { value: 'close', label: '💕 Close' },
              { value: 'casual', label: '👋 Casual' },
              { value: 'professional', label: '💼 Pro' },
            ]}
          />
        </View>

        {/* Current Type Description */}
        <Card style={componentStyles.descriptionCard}>
          <Card.Content>
            <Text style={componentStyles.typeLabel}>{currentTypeInfo.label}</Text>
            <Text style={componentStyles.typeDescription}>{currentTypeInfo.description}</Text>
          </Card.Content>
        </Card>

        {/* Add New Sample */}
        <Card style={componentStyles.inputCard}>
          <Card.Content>
            <Text style={componentStyles.inputLabel}>
              Write a sample message:
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              value={currentSample}
              onChangeText={setCurrentSample}
              placeholder={currentTypeInfo.placeholder}
              style={componentStyles.textInput}
            />
            <Button 
              mode="contained" 
              onPress={handleAddSample}
              loading={saving}
              disabled={saving || !currentSample.trim()}
              style={componentStyles.addButton}
            >
              Add Sample
            </Button>
          </Card.Content>
        </Card>

        {/* Existing Samples */}
        <Text style={componentStyles.sectionTitle}>
          Your {currentTypeInfo.label} Samples ({getStylesByType(selectedType).length})
        </Text>

        {getStylesByType(selectedType).length === 0 ? (
          <Card style={componentStyles.emptyCard}>
            <Card.Content>
              <Text style={componentStyles.emptyText}>
                No samples yet for {currentTypeInfo.label.toLowerCase()}. 
                Add a few examples of how you naturally write to help the AI!
              </Text>
            </Card.Content>
          </Card>
        ) : (
          getStylesByType(selectedType).map((style) => (
            <Card key={style.id} style={componentStyles.sampleCard}>
              <Card.Content>
                <View style={componentStyles.sampleHeader}>
                  <Text style={componentStyles.sampleDate}>
                    {new Date(style.createdAt).toLocaleDateString()}
                  </Text>
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    onPress={() => handleDeleteSample(style.id)}
                  />
                </View>
                <Text style={componentStyles.sampleText}>"{style.sample}"</Text>
              </Card.Content>
            </Card>
          ))
        )}

        {/* Tips */}
        <Card style={componentStyles.tipsCard}>
          <Card.Content>
            <Text style={componentStyles.tipsTitle}>💡 Tips for Better Results</Text>
            <Text style={componentStyles.tipItem}>• Add 2-3 samples per category</Text>
            <Text style={componentStyles.tipItem}>• Include your typical greetings and sign-offs</Text>
            <Text style={componentStyles.tipItem}>• Show how you use emojis, slang, or formal language</Text>
            <Text style={componentStyles.tipItem}>• Include examples of different moods (happy, checking in, etc.)</Text>
          </Card.Content>
        </Card>

        <View style={componentStyles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const componentStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introCard: {
    margin: 16,
    backgroundColor: '#F3E5FF',
    borderRadius: 12,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C4DFF',
    marginLeft: 8,
  },
  introText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  typeSelector: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  descriptionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
  },
  inputCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    marginBottom: 12,
    maxHeight: 150,
  },
  addButton: {
    backgroundColor: '#7C4DFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sampleCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
  },
  sampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleDate: {
    fontSize: 12,
    color: '#999',
  },
  sampleText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  tipsCard: {
    margin: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
