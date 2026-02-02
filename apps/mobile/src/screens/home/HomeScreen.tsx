import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import contactService from '../../services/contactService';
import eventService from '../../services/eventService';
import { RelationshipTipCard } from '../../components/ai';
import { useRelationshipTip } from '../../hooks/useAISuggestions';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalContacts: 0,
    upcomingEvents: 0,
  });
  
  // AI Relationship Tip
  const { data: tipData, isLoading: tipLoading, refetch: refetchTip } = useRelationshipTip();

  const loadStats = useCallback(async () => {
    try {
      const [contactsResponse, eventsResponse] = await Promise.all([
        contactService.getContacts({}, { page: 1, limit: 1 }),
        eventService.getEvents(
          {
            dateFrom: new Date().toISOString(),
            status: 'CONFIRMED',
          },
          1,
          1
        ),
      ]);

      setStats({
        totalContacts: contactsResponse.pagination.total,
        upcomingEvents: eventsResponse.pagination.total,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
    refetchTip();
  };

  const navigateToAddContact = () => {
    navigation.navigate('Contacts' as never, {
      screen: 'AddEditContact',
      params: {},
    } as never);
  };

  const navigateToCreateEvent = () => {
    navigation.navigate('Events' as never, {
      screen: 'AddEditEvent',
      params: {},
    } as never);
  };

  const navigateToContacts = () => {
    navigation.navigate('Contacts' as never);
  };

  const navigateToEvents = () => {
    navigation.navigate('Events' as never);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {user?.firstName || 'User'}! 👋
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.statCard} onPress={navigateToContacts}>
          <Text style={styles.statNumber}>{stats.totalContacts}</Text>
          <Text style={styles.statLabel}>Total Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={navigateToEvents}>
          <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
          <Text style={styles.statLabel}>Upcoming Events</Text>
        </TouchableOpacity>
      </View>

      {/* AI Relationship Tip */}
      <View style={styles.section}>
        <RelationshipTipCard
          tip={tipData?.tip || null}
          isLoading={tipLoading}
          onRefresh={() => refetchTip()}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionCard} onPress={navigateToAddContact}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📇</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Add New Contact</Text>
              <Text style={styles.actionSubtitle}>Start tracking a relationship</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={navigateToCreateEvent}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📅</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Create Event</Text>
              <Text style={styles.actionSubtitle}>Plan a meetup or gathering</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => navigation.navigate('Contacts' as never)}
        >
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>💬</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Get AI Message Suggestions</Text>
              <Text style={styles.actionSubtitle}>Select a contact to get started</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Empty State / Getting Started */}
      {stats.totalContacts === 0 && (
        <View style={styles.section}>
          <Card style={styles.gettingStartedCard}>
            <Card.Content>
              <Text style={styles.gettingStartedTitle}>🚀 Getting Started</Text>
              <Text style={styles.gettingStartedText}>
                Add your first contact to start building and nurturing your relationships!
              </Text>
              <TouchableOpacity
                style={styles.gettingStartedButton}
                onPress={navigateToAddContact}
              >
                <Text style={styles.gettingStartedButtonText}>Add First Contact</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        </View>
      )}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  gettingStartedCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
  },
  gettingStartedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  gettingStartedText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 16,
  },
  gettingStartedButton: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  gettingStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
