import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text,
  Switch,
  Button,
  Card,
  Divider,
  Portal,
  Dialog,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import NotificationService from '../../services/notificationService';
import { apiClient } from '../../config/api';

interface NotificationPreferences {
  enabled: boolean;
  reachOut: boolean;
  birthdays: boolean;
  anniversaries: boolean;
  events: boolean;
  savings: boolean;
  weeklySummary: boolean;
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
}

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(22);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    reachOut: true,
    birthdays: true,
    anniversaries: true,
    events: true,
    savings: true,
    weeklySummary: true,
    quietHours: {
      enabled: false,
      startHour: 22,
      endHour: 8,
    },
  });

  useEffect(() => {
    loadPreferences();
    registerDeviceToken();
  }, []);

  const loadPreferences = async () => {
    try {
      if (user) {
        const response = await apiClient.get('/auth/profile');
        const userPrefs = response.data.notificationPreferences as NotificationPreferences;
        if (userPrefs) {
          setPreferences({
            ...preferences,
            ...userPrefs,
          });
        }
      }
    } catch (error) {
      console.error('Load preferences error:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerDeviceToken = async () => {
    try {
      await NotificationService.registerDeviceToken();
    } catch (error) {
      console.error('Register device token error:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await apiClient.put('/auth/profile', {
        notificationPreferences: preferences,
      });

      Alert.alert('Success', 'Notification preferences saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
      console.error('Save preferences error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await NotificationService.scheduleTestNotification();
      Alert.alert('Test Notification', 'A test notification will appear in 2 seconds');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
      console.error('Test notification error:', error);
    }
  };

  const formatTime = (hour: number): string => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Notification Settings
          </Text>
          <View style={styles.switchRow}>
            <Text variant="bodyLarge">Enable Notifications</Text>
            <Switch
              value={preferences.enabled}
              onValueChange={(value) =>
                setPreferences({ ...preferences, enabled: value })
              }
            />
          </View>
        </Card.Content>
      </Card>

      {preferences.enabled && (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notification Types
              </Text>

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge">Reach Out Reminders</Text>
                  <Text variant="bodySmall" style={styles.description}>
                    Reminders to contact friends
                  </Text>
                </View>
                <Switch
                  value={preferences.reachOut}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, reachOut: value })
                  }
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge">Birthdays</Text>
                  <Text variant="bodySmall" style={styles.description}>
                    Birthday reminders
                  </Text>
                </View>
                <Switch
                  value={preferences.birthdays}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, birthdays: value })
                  }
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge">Anniversaries</Text>
                  <Text variant="bodySmall" style={styles.description}>
                    Anniversary reminders
                  </Text>
                </View>
                <Switch
                  value={preferences.anniversaries}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, anniversaries: value })
                  }
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge">Events</Text>
                  <Text variant="bodySmall" style={styles.description}>
                    Event reminders
                  </Text>
                </View>
                <Switch
                  value={preferences.events}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, events: value })
                  }
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge">Savings Goals</Text>
                  <Text variant="bodySmall" style={styles.description}>
                    Savings goal updates
                  </Text>
                </View>
                <Switch
                  value={preferences.savings}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, savings: value })
                  }
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge">Weekly Summary</Text>
                  <Text variant="bodySmall" style={styles.description}>
                    Sunday morning digest
                  </Text>
                </View>
                <Switch
                  value={preferences.weeklySummary}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, weeklySummary: value })
                  }
                />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Quiet Hours
              </Text>

              <View style={styles.switchRow}>
                <Text variant="bodyLarge">Enable Quiet Hours</Text>
                <Switch
                  value={preferences.quietHours.enabled}
                  onValueChange={(value) =>
                    setPreferences({
                      ...preferences,
                      quietHours: { ...preferences.quietHours, enabled: value },
                    })
                  }
                />
              </View>

              {preferences.quietHours.enabled && (
                <>
                  <View style={styles.timeRow}>
                    <Text variant="bodyMedium">Start Time</Text>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setTempHour(preferences.quietHours.startHour);
                        setShowStartTimePicker(true);
                      }}
                    >
                      {formatTime(preferences.quietHours.startHour)}
                    </Button>
                  </View>

                  <View style={styles.timeRow}>
                    <Text variant="bodyMedium">End Time</Text>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setTempHour(preferences.quietHours.endHour);
                        setShowEndTimePicker(true);
                      }}
                    >
                      {formatTime(preferences.quietHours.endHour)}
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </>
      )}

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={savePreferences}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        >
          Save Preferences
        </Button>

        <Button
          mode="outlined"
          onPress={handleTestNotification}
          style={styles.testButton}
        >
          Send Test Notification
        </Button>
      </View>

      <Portal>
        <Dialog visible={showStartTimePicker} onDismiss={() => setShowStartTimePicker(false)}>
          <Dialog.Title>Select Start Time</Dialog.Title>
          <Dialog.Content>
            <View style={styles.timePickerContainer}>
              <Button
                mode="outlined"
                onPress={() => setTempHour((h) => (h + 1) % 24)}
                style={styles.timeButton}
              >
                +
              </Button>
              <Text variant="headlineMedium" style={styles.timeDisplay}>
                {formatTime(tempHour)}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}
                style={styles.timeButton}
              >
                -
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowStartTimePicker(false)}>Cancel</Button>
            <Button
              onPress={() => {
                setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, startHour: tempHour },
                });
                setShowStartTimePicker(false);
              }}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showEndTimePicker} onDismiss={() => setShowEndTimePicker(false)}>
          <Dialog.Title>Select End Time</Dialog.Title>
          <Dialog.Content>
            <View style={styles.timePickerContainer}>
              <Button
                mode="outlined"
                onPress={() => setTempHour((h) => (h + 1) % 24)}
                style={styles.timeButton}
              >
                +
              </Button>
              <Text variant="headlineMedium" style={styles.timeDisplay}>
                {formatTime(tempHour)}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}
                style={styles.timeButton}
              >
                -
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEndTimePicker(false)}>Cancel</Button>
            <Button
              onPress={() => {
                setPreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, endHour: tempHour },
                });
                setShowEndTimePicker(false);
              }}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.6,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  description: {
    opacity: 0.6,
    marginTop: 4,
  },
  divider: {
    marginVertical: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    marginBottom: 12,
  },
  testButton: {
    marginBottom: 32,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  timeButton: {
    minWidth: 60,
  },
  timeDisplay: {
    minWidth: 100,
    textAlign: 'center',
  },
});
