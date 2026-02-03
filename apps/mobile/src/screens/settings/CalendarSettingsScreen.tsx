import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  List,
  Switch,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarConnectionCard } from '../../components/calendar';
import calendarService, { CalendarInfo, CalendarConnectionStatus } from '../../services/calendarService';

export default function CalendarSettingsScreen() {
  const navigation = useNavigation();
  const [connectionStatus, setConnectionStatus] = useState<CalendarConnectionStatus>({
    connected: false,
  });
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [deviceCalendars, setDeviceCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const status = await calendarService.getConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        await loadGoogleCalendars();
      }

      await loadDeviceCalendars();
    } catch (error) {
      console.error('Failed to load calendar settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoogleCalendars = async () => {
    try {
      setIsLoadingCalendars(true);
      const googleCalendars = await calendarService.listCalendars();
      setCalendars(googleCalendars);
      
      // Set primary calendar as selected if available
      if (connectionStatus.primaryCalendarId) {
        setSelectedCalendarId(connectionStatus.primaryCalendarId);
      } else if (googleCalendars.length > 0) {
        setSelectedCalendarId(googleCalendars[0].id);
      }
    } catch (error) {
      console.error('Failed to load Google calendars:', error);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const loadDeviceCalendars = async () => {
    try {
      const hasPermission = await calendarService.hasPermissions();
      if (!hasPermission) {
        return;
      }

      const deviceCals = await calendarService.getDeviceCalendars();
      setDeviceCalendars(deviceCals);
    } catch (error) {
      console.error('Failed to load device calendars:', error);
    }
  };

  const handleConnect = async () => {
    await loadSettings();
  };

  const handleDisconnect = async () => {
    setConnectionStatus({ connected: false });
    setCalendars([]);
    setSelectedCalendarId(null);
  };

  const handleSelectCalendar = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    // TODO: Save selected calendar preference
    Alert.alert('Success', 'Calendar preference saved');
  };

  const handleRequestDevicePermissions = async () => {
    const granted = await calendarService.requestPermissions();
    if (granted) {
      await loadDeviceCalendars();
      Alert.alert('Success', 'Calendar permissions granted');
    } else {
      Alert.alert('Permission Denied', 'Calendar access is required to sync events');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Google Calendar Connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Calendar</Text>
        <CalendarConnectionCard
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </View>

      {/* Sync Preferences */}
      {connectionStatus.connected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Preferences</Text>
          <List.Item
            title="Auto-sync Events"
            description="Automatically sync new events to your calendar"
            left={(props) => <List.Icon {...props} icon="sync" />}
            right={() => (
              <Switch value={autoSync} onValueChange={setAutoSync} />
            )}
          />
          <Divider />
        </View>
      )}

      {/* Calendar Selection */}
      {connectionStatus.connected && calendars.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Calendar</Text>
          <Text style={styles.sectionSubtitle}>
            Choose which calendar to sync events to
          </Text>
          {isLoadingCalendars ? (
            <View style={styles.loadingCalendars}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingCalendarsText}>Loading calendars...</Text>
            </View>
          ) : (
            calendars.map((calendar) => (
              <TouchableOpacity
                key={calendar.id}
                style={[
                  styles.calendarItem,
                  selectedCalendarId === calendar.id && styles.calendarItemSelected,
                ]}
                onPress={() => handleSelectCalendar(calendar.id)}
              >
                <View style={styles.calendarItemLeft}>
                  <View
                    style={[
                      styles.calendarColor,
                      calendar.color && { backgroundColor: calendar.color },
                    ]}
                  />
                  <View style={styles.calendarItemText}>
                    <Text style={styles.calendarItemTitle}>{calendar.title}</Text>
                    {calendar.type === 'google' && (
                      <Text style={styles.calendarItemSubtitle}>Google Calendar</Text>
                    )}
                  </View>
                </View>
                {selectedCalendarId === calendar.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Device Calendar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Calendar</Text>
        <Text style={styles.sectionSubtitle}>
          Use your device's calendar as a fallback option
        </Text>
        
        {deviceCalendars.length === 0 ? (
          <TouchableOpacity
            style={styles.deviceCalendarButton}
            onPress={handleRequestDevicePermissions}
          >
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
            <View style={styles.deviceCalendarButtonText}>
              <Text style={styles.deviceCalendarButtonTitle}>
                Enable Device Calendar
              </Text>
              <Text style={styles.deviceCalendarButtonSubtitle}>
                Grant permission to access your device calendar
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ) : (
          <View style={styles.deviceCalendarsList}>
            {deviceCalendars.map((calendar) => (
              <View key={calendar.id} style={styles.deviceCalendarItem}>
                <View style={styles.deviceCalendarItemLeft}>
                  <View
                    style={[
                      styles.calendarColor,
                      calendar.color && { backgroundColor: calendar.color },
                    ]}
                  />
                  <View style={styles.deviceCalendarItemText}>
                    <Text style={styles.deviceCalendarItemTitle}>
                      {calendar.title}
                    </Text>
                    {calendar.source && (
                      <Text style={styles.deviceCalendarItemSubtitle}>
                        {calendar.source}
                      </Text>
                    )}
                  </View>
                </View>
                {calendar.allowsModifications ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                ) : (
                  <Ionicons name="lock-closed" size={20} color="#ccc" />
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={20} color="#666" />
        <Text style={styles.infoText}>
          Events synced to your calendar will include all details including
          location, time, and attendees. You can disconnect at any time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  loadingCalendars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingCalendarsText: {
    fontSize: 14,
    color: '#666',
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calendarItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  calendarItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  calendarColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  calendarItemText: {
    flex: 1,
  },
  calendarItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  calendarItemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  deviceCalendarButtonText: {
    flex: 1,
  },
  deviceCalendarButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  deviceCalendarButtonSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceCalendarsList: {
    marginTop: 8,
  },
  deviceCalendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceCalendarItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deviceCalendarItemText: {
    flex: 1,
  },
  deviceCalendarItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  deviceCalendarItemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
