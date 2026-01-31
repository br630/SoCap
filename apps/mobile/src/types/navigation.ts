import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type ContactStackParamList = {
  ContactList: undefined;
  ContactDetail: { id: string };
  AddEditContact: { contactId?: string };
  ImportContacts: undefined;
};

export type SettingsStackParamList = {
  Profile: undefined;
  NotificationPreferences: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Contacts: NavigatorScreenParams<ContactStackParamList>;
  Events: undefined;
  Profile: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
