import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import calendarService, { CalendarConnectionStatus } from '../../services/calendarService';

interface CalendarConnectionCardProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function CalendarConnectionCard({
  onConnect,
  onDisconnect,
}: CalendarConnectionCardProps) {
  const [status, setStatus] = useState<CalendarConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const connectionStatus = await calendarService.getConnectionStatus();
      setStatus(connectionStatus);
    } catch (error) {
      console.error('Failed to load calendar status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await calendarService.connectGoogleCalendar();
      await loadStatus();
      onConnect?.();
      Alert.alert('Success', 'Google Calendar connected successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Calendar',
      'Are you sure you want to disconnect your Google Calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDisconnecting(true);
              await calendarService.disconnectCalendar();
              await loadStatus();
              onDisconnect?.();
              Alert.alert('Success', 'Calendar disconnected successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to disconnect calendar');
            } finally {
              setIsDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.loadingContent}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Checking calendar status...</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name={status.connected ? 'calendar' : 'calendar-outline'}
              size={24}
              color={status.connected ? '#34C759' : '#666'}
            />
            <View style={styles.headerText}>
              <Text style={styles.title}>Google Calendar</Text>
              <Text style={styles.subtitle}>
                {status.connected
                  ? 'Connected'
                  : 'Not connected'}
              </Text>
            </View>
          </View>
          {status.connected && (
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          )}
        </View>

        {status.connected && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Last synced: {formatLastSync(status.lastSyncAt)}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {status.connected ? (
            <Button
              mode="outlined"
              onPress={handleDisconnect}
              disabled={isDisconnecting}
              loading={isDisconnecting}
              icon="link-off"
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleConnect}
              disabled={isConnecting}
              loading={isConnecting}
              icon="link"
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Connect Google Calendar
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
