import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/home/HomeScreen';
import ContactListScreen from '../screens/contacts/ContactListScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';
import AddEditContactScreen from '../screens/contacts/AddEditContactScreen';
import ImportContactsScreen from '../screens/contacts/ImportContactsScreen';
import EventsScreen from '../screens/events/EventsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

import { MainTabParamList, ContactStackParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ContactStack = createStackNavigator<ContactStackParamList>();

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
    </ContactStack.Navigator>
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
        component={EventsScreen}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }: { color: string }) => <TabIcon icon="📅" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

