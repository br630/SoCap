import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import {
  HealthScoreCard,
  ReminderMiniCard,
  QuickActionButton,
  ContactAvatarScroll,
  MiniEventCard,
  RelationshipTipCard,
} from '../../components/dashboard';
import { TrendingInterestsCard } from '../../components/interests';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: dashboardData, isLoading, refetch, isRefetching } = useDashboard();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const navigateToContact = (contactId: string) => {
    navigation.navigate('Contacts' as never, {
      screen: 'ContactDetail',
      params: { id: contactId },
    } as never);
  };

  const navigateToEvent = (eventId: string) => {
    navigation.navigate('Events' as never, {
      screen: 'EventDetail',
      params: { id: eventId },
    } as never);
  };

  const navigateToReminders = () => {
    navigation.navigate('Reminders' as never);
  };

  const navigateToInsights = () => {
    // Will be implemented when InsightsScreen is created
    navigation.navigate('Profile' as never, {
      screen: 'Insights',
    } as never);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const data = dashboardData || {
    healthScore: 0,
    healthScoreTrend: 0,
    todayReminders: [],
    upcomingEvents: [],
    contactsNeedingAttention: [],
    savingsSummary: { totalSaved: 0, activeGoals: 0, nearestDeadline: null },
    tipOfTheDay: 'Start building meaningful relationships today!',
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
      }
    >
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.firstName || 'there'}! 👋
        </Text>
        <Text style={styles.date}>{formatDate()}</Text>
      </View>

      {/* Health Score Card */}
      <HealthScoreCard
        score={data.healthScore}
        trend={data.healthScoreTrend}
        onPress={navigateToInsights}
      />

      {/* Today's Reminders Card */}
      {data.todayReminders.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Reminders</Text>
              <TouchableOpacity onPress={navigateToReminders}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {data.todayReminders.slice(0, 3).map((reminder) => (
              <ReminderMiniCard
                key={reminder.id}
                reminder={reminder}
                onPress={() => {
                  if (reminder.contact?.id) {
                    navigateToContact(reminder.contact.id);
                  } else if (reminder.event?.id) {
                    navigateToEvent(reminder.event.id);
                  }
                }}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Quick Actions Row */}
      <View style={styles.quickActionsContainer}>
        <QuickActionButton
          icon="chatbubble-ellipses-outline"
          label="Log Interaction"
          onPress={() => {
            navigation.navigate('Contacts' as never, {
              screen: 'ContactList',
              params: { mode: 'log-interaction' },
            } as never);
          }}
          color="#007AFF"
        />
        <QuickActionButton
          icon="calendar-outline"
          label="Plan Event"
          onPress={() => {
            navigation.navigate('Events' as never, {
              screen: 'CreateEvent',
            } as never);
          }}
          color="#4CAF50"
        />
        <QuickActionButton
          icon="person-add-outline"
          label="Add Contact"
          onPress={() => {
            navigation.navigate('Contacts' as never, {
              screen: 'AddEditContact',
              params: {},
            } as never);
          }}
          color="#FF9800"
        />
        <QuickActionButton
          icon="sparkles-outline"
          label="AI Suggest"
          onPress={() => {
            navigation.navigate('Contacts' as never, {
              screen: 'ContactList',
              params: { mode: 'ai-suggest' },
            } as never);
          }}
          color="#9C27B0"
        />
      </View>

      {/* Contacts Needing Attention */}
      {data.contactsNeedingAttention.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacts Needing Attention</Text>
          <ContactAvatarScroll
            contacts={data.contactsNeedingAttention}
            onContactPress={navigateToContact}
          />
        </View>
      )}

      {/* Trending in Your Interests */}
      <TrendingInterestsCard
        onPressInterest={(interest) => {
          // Navigate to contacts with this shared interest
          navigation.navigate('Contacts' as never);
        }}
      />

      {/* Upcoming Events */}
      {data.upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Events' as never)}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {data.upcomingEvents.slice(0, 3).map((event) => (
            <MiniEventCard
              key={event.id}
              event={event}
              onPress={() => navigateToEvent(event.id)}
            />
          ))}
        </View>
      )}

      {/* AI-Powered Tip of the Day */}
      <RelationshipTipCard fallbackTip={data.tipOfTheDay} />
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  greetingSection: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
  },
});
