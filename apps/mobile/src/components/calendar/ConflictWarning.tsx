import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Conflict } from '../../services/calendarService';

interface ConflictWarningProps {
  conflicts: Conflict[];
  onProceed: () => void;
  onChangeTime: () => void;
}

export default function ConflictWarning({
  conflicts,
  onProceed,
  onChangeTime,
}: ConflictWarningProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={24} color="#FF9800" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Schedule Conflict</Text>
            <Text style={styles.subtitle}>
              You have {conflicts.length} conflicting event{conflicts.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.conflictsList}>
          {conflicts.map((conflict, index) => (
            <View key={index} style={styles.conflictItem}>
              <View style={styles.conflictInfo}>
                <Text style={styles.conflictTitle}>{conflict.title}</Text>
                <View style={styles.conflictTime}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.conflictTimeText}>
                    {formatDate(conflict.start)} • {formatTime(conflict.start)} -{' '}
                    {formatTime(conflict.end)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onChangeTime}
            style={styles.changeButton}
            labelStyle={styles.changeButtonLabel}
            icon="time-outline"
          >
            Change Time
          </Button>
          <Button
            mode="contained"
            onPress={onProceed}
            style={styles.proceedButton}
            labelStyle={styles.proceedButtonLabel}
            buttonColor="#FF9800"
          >
            Proceed Anyway
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  conflictsList: {
    marginBottom: 16,
  },
  conflictItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  conflictTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conflictTimeText: {
    fontSize: 13,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    borderRadius: 8,
  },
  changeButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  proceedButton: {
    flex: 1,
    borderRadius: 8,
  },
  proceedButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
