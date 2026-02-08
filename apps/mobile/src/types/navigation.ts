import { NavigatorScreenParams } from '@react-navigation/native';
import { VenueSuggestion } from '../services/eventService';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type ContactStackParamList = {
  ContactList: { mode?: 'log-interaction' | 'ai-suggest' } | undefined;
  ContactDetail: { id: string; openLogDialog?: boolean };
  AddEditContact: { contactId?: string };
  ImportContacts: undefined;
  ContactMessages: { contactId: string; contactName: string; contactPhone?: string };
  ContactEvents: { contactId: string; contactName: string };
};

export type EventStackParamList = {
  EventList: undefined;
  EventDetail: { id: string };
  CreateEvent: { eventId?: string; mode?: 'edit' };
  SelectAttendees: { eventId: string; preSelectedIds?: string[] };
  VenueSearch: { onSelect?: (venue: VenueSuggestion) => void };
};

export type SettingsStackParamList = {
  Profile: undefined;
  NotificationPreferences: undefined;
  CalendarSettings: undefined;
  Insights: undefined;
  SecuritySettings: undefined;
  WritingStyle: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Contacts: NavigatorScreenParams<ContactStackParamList>;
  Events: NavigatorScreenParams<EventStackParamList>;
  Profile: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  // Modal screens accessible from anywhere
  AddEditEvent: { contactId?: string };
  SavingsGoal: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
