import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { Interaction } from '../../services/contactService';

interface InteractionItemProps {
  interaction: Interaction;
}

const interactionIcons: Record<Interaction['type'], string> = {
  CALL: 'phone',
  TEXT: 'message-text',
  VIDEO_CALL: 'video',
  IN_PERSON: 'account',
  EVENT: 'calendar',
};

const sentimentColors: Record<string, string> = {
  POSITIVE: '#34C759',
  NEUTRAL: '#8E8E93',
  NEGATIVE: '#FF3B30',
};

export default function InteractionItem({ interaction }: InteractionItemProps) {
  const theme = useTheme();
  const date = new Date(interaction.date);
  const icon = interactionIcons[interaction.type] || 'circle';

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <List.Item
      title={interaction.type.replace('_', ' ')}
      description={
        <View>
          <Text variant="bodySmall" style={styles.date}>
            {formatDate(date)}
          </Text>
          {interaction.duration && (
            <Text variant="bodySmall" style={styles.duration}>
              Duration: {interaction.duration} min
            </Text>
          )}
          {interaction.notes && (
            <Text variant="bodySmall" style={styles.notes}>
              {interaction.notes}
            </Text>
          )}
        </View>
      }
      left={(props) => (
        <List.Icon
          {...props}
          icon={icon}
          color={interaction.sentiment ? sentimentColors[interaction.sentiment] : theme.colors.primary}
        />
      )}
      right={() =>
        interaction.sentiment ? (
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentColors[interaction.sentiment] }]}>
            <Text style={styles.sentimentText}>{interaction.sentiment}</Text>
          </View>
        ) : null
      }
      style={styles.item}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 8,
  },
  date: {
    opacity: 0.7,
    marginBottom: 2,
  },
  duration: {
    opacity: 0.6,
    marginTop: 2,
  },
  notes: {
    opacity: 0.8,
    marginTop: 4,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    marginRight: 8,
  },
  sentimentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
