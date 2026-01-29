import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import contactService from '../../services/contactService';
import eventService from '../../services/eventService';
import authService from '../../services/authService';

export default function HomeScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalContacts: 0,
    upcomingEvents: 0,
    loading: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [contactsResponse, eventsResponse] = await Promise.all([
        contactService.getContacts({}, 1, 1),
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
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {user?.firstName || 'User'}! 👋
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalContacts}</Text>
          <Text style={styles.statLabel}>Total Contacts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
          <Text style={styles.statLabel}>Upcoming Events</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionCard}>
          <Text style={styles.actionText}>📇 Add New Contact</Text>
        </View>
        <View style={styles.actionCard}>
          <Text style={styles.actionText}>📅 Create Event</Text>
        </View>
      </View>
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
    padding: 20,
    gap: 15,
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
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
});
