import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import aiService, { RelationshipTip } from '../../services/aiService';

interface RelationshipTipCardProps {
  fallbackTip?: string;
}

export default function RelationshipTipCard({ fallbackTip }: RelationshipTipCardProps) {
  const [tip, setTip] = useState<RelationshipTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTip();
  }, []);

  const fetchTip = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getRelationshipTip();
      setTip(response.tip);
    } catch (err: any) {
      console.error('Failed to load relationship tip:', err);
      setError(err.message || 'Failed to load tip');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#5856D6" />
          <Text style={styles.loadingText}>Getting today's insight...</Text>
        </Card.Content>
      </Card>
    );
  }

  // Show fallback if no AI tip available
  if (!tip) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="bulb-outline" size={24} color="#FFB300" />
            </View>
            <Text style={styles.title}>Tip of the Day</Text>
            <TouchableOpacity onPress={fetchTip} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipText}>
            {fallbackTip || "Remember to reach out to your inner circle regularly to maintain strong relationships."}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>💡</Text>
          </View>
          <Text style={styles.title}>{tip.title}</Text>
          <TouchableOpacity onPress={fetchTip} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.adviceText}>{tip.advice}</Text>

        {/* Action Item */}
        <View style={styles.actionContainer}>
          <View style={styles.actionIcon}>
            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
          </View>
          <Text style={styles.actionText}>
            <Text style={styles.actionLabel}>Today's action: </Text>
            {tip.actionItem}
          </Text>
        </View>

        {/* Source/Attribution */}
        {tip.source && (
          <Text style={styles.sourceText}>— {tip.source}</Text>
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
    elevation: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFB30020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
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
  adviceText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#34C75915',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  actionIcon: {
    marginTop: 1,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionLabel: {
    fontWeight: '600',
    color: '#34C759',
  },
  sourceText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'right',
  },
});
