import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
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
import { colors, shadows, radii, spacing, typography } from '../../theme/paperTheme';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: dashboardData, isLoading, refetch, isRefetching } = useDashboard();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
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
    navigation.navigate('Profile' as never, {
      screen: 'Insights',
    } as never);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.firstName || 'there'}!
          </Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
      </View>

      {/* Health Score Card */}
      <HealthScoreCard
        score={data.healthScore}
        trend={data.healthScoreTrend}
        onPress={navigateToInsights}
      />

      {/* Today's Reminders */}
      {data.todayReminders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Reminders</Text>
            <TouchableOpacity onPress={navigateToReminders}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.remindersScroll}
          >
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
          </ScrollView>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <QuickActionButton
            icon="document-text-outline"
            label="Log Interaction"
            onPress={() => {
              navigation.navigate('Contacts' as never, {
                screen: 'ContactList',
                params: { mode: 'log-interaction' },
              } as never);
            }}
            color={colors.primary}
          />
          <QuickActionButton
            icon="calendar-outline"
            label="Plan Event"
            onPress={() => {
              navigation.navigate('Events' as never, {
                screen: 'CreateEvent',
              } as never);
            }}
            color={colors.primary}
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
            color={colors.primary}
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
            color={colors.secondary}
          />
        </View>
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

      {/* Trending Interests */}
      <View style={styles.section}>
        <TrendingInterestsCard
          onPressInterest={(interest) => {
            navigation.navigate('Contacts' as never);
          }}
        />
      </View>

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

      {/* AI Tip */}
      <RelationshipTipCard fallbackTip={data.tipOfTheDay} />

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  greetingSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  greeting: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  date: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAllText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  remindersScroll: {
    paddingHorizontal: spacing.lg,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    ...shadows.light,
  },
});
