import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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

// Icon component wrapper to ensure proper type
const TabIcon = ({ icon, color }: { icon: string; color: string }) => (
  <Text style={{ color, fontSize: 24 }}>{icon}</Text>
);

function ContactNavigator() {
  return (
    <ContactStack.Navigator>
      <ContactStack.Screen
        name="ContactList"
        component={ContactListScreen}
        options={{ title: 'Contacts' }}
      />
      <ContactStack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{ title: 'Contact Details' }}
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
          title: `Message ${route.params?.contactName || 'Contact'}` 
        })}
      />
      <ContactStack.Screen
        name="ContactEvents"
        component={ContactEventsScreen}
        options={({ route }: any) => ({ 
          title: `Events with ${route.params?.contactName || 'Contact'}` 
        })}
      />
    </ContactStack.Navigator>
  );
}

function EventNavigator() {
  return (
    <EventStack.Navigator>
      <EventStack.Screen
        name="EventList"
        component={EventsScreen}
        options={{ title: 'Events' }}
      />
      <EventStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: 'Event Details' }}
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
            : 'Create Event' 
        })}
      />
    </EventStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactNavigator}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color }: { color: string }) => <TabIcon icon="👥" color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventNavigator}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }: { color: string }) => <TabIcon icon="📅" color={color} />,
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <TabIcon icon="👤" color={color} />,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <SettingsStack.Navigator>
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
