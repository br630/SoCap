# Authentication Setup Guide

## Overview

The authentication system is set up with Firebase Auth and integrates with your backend API.

## Environment Variables

Create a `.env` file in `apps/mobile/` with:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
```

## Required Packages

The following packages are already installed:
- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `expo-secure-store`
- `axios`
- `@react-navigation/native`
- `@react-navigation/stack`
- `@react-navigation/bottom-tabs`

## Optional Packages (for Social Login)

### Google Sign-In

For Google OAuth, install:
```bash
npm install @react-native-google-signin/google-signin
```

Or for Expo:
```bash
npx expo install expo-auth-session expo-crypto
```

Then update `authService.ts` to use the appropriate package.

### Apple Sign-In

For Apple Sign-In (iOS only), install:
```bash
npm install @invertase/react-native-apple-authentication
```

Or for Expo:
```bash
npx expo install expo-apple-authentication
```

Then update `authService.ts` to use the appropriate package.

## Firebase Configuration

1. Add your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) files
2. Configure Firebase in your `app.json` or native config files
3. Enable Authentication providers in Firebase Console:
   - Email/Password
   - Google (if using)
   - Apple (if using)

## File Structure

```
src/
├── config/
│   └── api.ts              # API client configuration
├── context/
│   └── AuthContext.tsx     # Auth context provider
├── hooks/
│   └── useAuth.ts          # Auth hook
├── services/
│   └── authService.ts      # Auth API service
├── screens/
│   └── auth/
│       ├── LoginScreen.tsx
│       ├── RegisterScreen.tsx
│       └── ForgotPasswordScreen.tsx
└── navigation/
    ├── RootNavigator.tsx   # Main navigation router
    ├── AuthNavigator.tsx   # Auth flow navigation
    └── MainNavigator.tsx   # Main app navigation
```

## Usage

### Using Auth in Components

```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return <Text>Please log in</Text>;
  }

  return (
    <View>
      <Text>Welcome, {user?.firstName}!</Text>
      <Button onPress={signOut} title="Sign Out" />
    </View>
  );
}
```

### Navigation

The app automatically navigates based on authentication state:
- Unauthenticated → AuthNavigator (Login/Register screens)
- Authenticated → MainNavigator (Main app screens)

## Features

- ✅ Email/Password authentication
- ✅ Firebase token management
- ✅ Secure token storage with SecureStore
- ✅ Auto token refresh (every 50 minutes)
- ✅ Persistent auth state
- ✅ Form validation
- ✅ Error handling
- ⚠️ Google Sign-In (requires package installation)
- ⚠️ Apple Sign-In (requires package installation)

## Next Steps

1. Install optional packages for social login if needed
2. Configure Firebase project settings
3. Update API URL in `.env`
4. Test authentication flow
5. Customize UI components (currently using basic React Native components)
