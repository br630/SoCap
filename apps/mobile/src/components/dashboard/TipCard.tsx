import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface TipCardProps {
  tip: string;
  onRefresh?: () => void;
  onLearnMore?: () => void;
}

export default function TipCard({ tip, onRefresh, onLearnMore }: TipCardProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="bulb-outline" size={24} color="#FFB300" />
          </View>
          <Text style={styles.title}>Tip of the Day</Text>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.tipText}>{tip}</Text>

        {onLearnMore && (
          <Button
            mode="text"
            onPress={onLearnMore}
            style={styles.learnMoreButton}
            labelStyle={styles.learnMoreLabel}
            icon="open-outline"
          >
            Learn More
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFB30020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  refreshButton: {
    padding: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  learnMoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB300',
  },
});
