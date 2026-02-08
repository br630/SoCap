import React from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, Switch, Card, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAutoSync } from '../../hooks/useAutoSync';

export function AutoSyncSettings() {
  const {
    isEnabled,
    hasPermission,
    isAndroid,
    isIOS,
    isQuickLogEnabled,
    lastSyncTime,
    lastSyncResult,
    isSyncing,
    syncNow,
    enableAutoSync,
    disableAutoSync,
  } = useAutoSync();

  const handleToggle = async () => {
    if (isEnabled) {
      const message = isIOS
        ? 'Are you sure you want to disable call logging prompts?'
        : 'Are you sure you want to disable automatic interaction logging?';
      
      Alert.alert(
        isIOS ? 'Disable Quick Log' : 'Disable Auto-Sync',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', onPress: disableAutoSync },
        ]
      );
    } else {
      const success = await enableAutoSync();
      if (!success && isAndroid) {
        Alert.alert(
          'Permission Required',
          'Auto-sync requires access to your call logs. Please grant permission in your device settings.'
        );
      }
    }
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return lastSyncTime.toLocaleDateString();
  };

  // iOS UI
  if (isIOS) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="call-outline" size={24} color={isQuickLogEnabled ? '#34C759' : '#666'} />
              <Text style={styles.title}>Quick Log Calls</Text>
            </View>
            <Switch
              value={isQuickLogEnabled}
              onValueChange={handleToggle}
            />
          </View>

          <Text style={styles.description}>
            Get prompted to log calls after they end. This helps keep your relationship health score
            accurate without automatic access to your call history.
          </Text>

          {isQuickLogEnabled && (
            <View style={styles.iosInfoSection}>
              <View style={styles.iosInfoItem}>
                <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                <Text style={styles.iosInfoText}>You'll be prompted after calls end</Text>
              </View>
              <View style={styles.iosInfoItem}>
                <Ionicons name="shield-checkmark" size={18} color="#34C759" />
                <Text style={styles.iosInfoText}>Your call history stays private</Text>
              </View>
              <View style={styles.iosInfoItem}>
                <Ionicons name="time-outline" size={18} color="#34C759" />
                <Text style={styles.iosInfoText}>Log calls with one tap</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="sync" size={24} color={isEnabled ? '#34C759' : '#666'} />
            <Text style={styles.title}>Auto-Sync Calls</Text>
          </View>
          <Switch
            value={isEnabled && hasPermission}
            onValueChange={handleToggle}
            disabled={isSyncing}
          />
        </View>

        <Text style={styles.description}>
          Automatically log phone calls with your contacts to keep your relationship health score
          accurate.
        </Text>

        {isEnabled && hasPermission && (
          <View style={styles.statusSection}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last sync:</Text>
              <Text style={styles.statusValue}>{formatLastSync()}</Text>
            </View>

            {lastSyncResult && lastSyncResult.created > 0 && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last result:</Text>
                <Text style={styles.statusValue}>
                  {lastSyncResult.created} logged, {lastSyncResult.skipped} skipped
                </Text>
              </View>
            )}

            <Button
              mode="outlined"
              onPress={syncNow}
              loading={isSyncing}
              disabled={isSyncing}
              style={styles.syncButton}
              icon="sync"
            >
              Sync Now
            </Button>
          </View>
        )}

        {!hasPermission && isEnabled && (
          <View style={styles.permissionWarning}>
            <Ionicons name="warning" size={20} color="#FF9500" />
            <Text style={styles.warningText}>
              Permission required. Tap the toggle to grant access.
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  unavailableText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  statusSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
  },
  statusValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  syncButton: {
    marginTop: 12,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9500',
  },
  iosInfoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  iosInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iosInfoText: {
    fontSize: 14,
    color: '#333',
  },
});
