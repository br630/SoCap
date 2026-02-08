import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import ContactListScreen from '../screens/contacts/ContactListScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';
import AddEditContactScreen from '../screens/contacts/AddEditContactScreen';
import ImportContactsScreen from '../screens/contacts/ImportContactsScreen';
import ContactMessagesScreen from '../screens/contacts/ContactMessagesScreen';
import ContactEventsScreen from '../screens/contacts/ContactEventsScreen';
import EventsScreen from '../screens/events/EventsScreen';
import AddEditEventScreen from '../screens/events/AddEditEventScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationPreferencesScreen from '../screens/settings/NotificationPreferencesScreen';
import CalendarSettingsScreen from '../screens/settings/CalendarSettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import WritingStyleScreen from '../screens/settings/WritingStyleScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import { colors, spacing, typography } from '../theme/paperTheme';

import { MainTabParamList, ContactStackParamList, SettingsStackParamList } from '../types/navigation';

type EventStackParamList = {
  EventList: undefined;
  EventDetail: { id: string };
  AddEditEvent: { contactId?: string };
  CreateEvent: { preSelectedAttendees?: string[]; contactName?: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const ContactStack = createStackNavigator<ContactStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();
const EventStack = createStackNavigator<EventStackParamList>();

function ContactNavigator() {
  return (
    <ContactStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, letterSpacing: -0.2 },
      }}
    >
      <ContactStack.Screen
        name="ContactList"
        component={ContactListScreen}
        options={{ title: 'Contacts' }}
      />
      <ContactStack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{ title: 'Contact Detail' }}
      />
      <ContactStack.Screen
        name="AddEditContact"
        component={AddEditContactScreen}
        options={{ title: 'Add Contact' }}
      />
      <ContactStack.Screen
        name="ImportContacts"
        component={ImportContactsScreen}
        options={{ title: 'Import Contacts' }}
      />
      <ContactStack.Screen
        name="ContactMessages"
        component={ContactMessagesScreen}
        options={({ route }: any) => ({
          title: `Message ${route.params?.contactName || 'Contact'}`,
        })}
      />
      <ContactStack.Screen
        name="ContactEvents"
        component={ContactEventsScreen}
        options={({ route }: any) => ({
          title: `Events with ${route.params?.contactName || 'Contact'}`,
        })}
      />
    </ContactStack.Navigator>
  );
}

function EventNavigator() {
  return (
    <EventStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, letterSpacing: -0.2 },
      }}
    >
      <EventStack.Screen
        name="EventList"
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <EventStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Event Detail' }}
      />
      <EventStack.Screen
        name="AddEditEvent"
        component={AddEditEventScreen}
        options={{ title: 'Create Event' }}
      />
      <EventStack.Screen
        name="CreateEvent"
        component={AddEditEventScreen}
        options={({ route }: any) => ({
          title: route.params?.contactName
            ? `Event with ${route.params.contactName}`
            : 'Create Event',
        })}
      />
    </EventStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, letterSpacing: -0.2 },
      }}
    >
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <SettingsStack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ title: 'Notification Settings' }}
      />
      <SettingsStack.Screen
        name="CalendarSettings"
        component={CalendarSettingsScreen}
        options={{ title: 'Calendar Settings' }}
      />
      <SettingsStack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ title: 'Security Settings' }}
      />
      <SettingsStack.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ title: 'Insights & Analytics' }}
      />
      <SettingsStack.Screen
        name="WritingStyle"
        component={WritingStyleScreen}
        options={{ title: 'My Writing Style' }}
      />
    </SettingsStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          ...{
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 8,
          },
          height: 84,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactNavigator}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
        listeners={({ navigation: nav }) => ({
          tabPress: (e) => {
            // Always reset to ContactList when tab is pressed
            nav.navigate('Contacts', { screen: 'ContactList' });
          },
        })}
      />
      <Tab.Screen
        name="Events"
        component={EventNavigator}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}
