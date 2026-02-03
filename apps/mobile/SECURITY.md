# Mobile App Security Documentation

This document outlines the security measures implemented in the SoCap mobile app.

## Table of Contents

1. [Secure Storage](#secure-storage)
2. [Token Management](#token-management)
3. [Biometric Authentication](#biometric-authentication)
4. [SSL Certificate Pinning](#ssl-certificate-pinning)
5. [Screenshot Prevention](#screenshot-prevention)
6. [Jailbreak/Root Detection](#jailbreakroot-detection)
7. [Session Management](#session-management)
8. [Secure Input](#secure-input)

## Secure Storage

### Implementation
- **expo-secure-store**: All sensitive data is stored using `expo-secure-store`
- **Never AsyncStorage**: Tokens, credentials, and sensitive data are never stored in AsyncStorage
- **Automatic Encryption**: expo-secure-store automatically encrypts data using the device's keychain/keystore

### Stored Data
- Authentication tokens
- User credentials
- Biometric settings
- Session data

### Clear on Logout
All secure storage is cleared when the user logs out.

## Token Management

### Short-Lived Tokens
- **Access Token**: 15 minutes (configurable)
- **Refresh Token**: Used to obtain new access tokens
- **Automatic Refresh**: Tokens are automatically refreshed 5 minutes before expiry

### Token Storage
- Stored securely using `expo-secure-store`
- Never stored in AsyncStorage or plain text
- Automatically cleared on logout or suspicious activity

### Token Refresh Flow
1. Token service checks expiry before each API call
2. If token expires within 5 minutes, automatically refreshes
3. Uses Firebase ID token refresh mechanism
4. Falls back to re-authentication if refresh fails

## Biometric Authentication

### Supported Methods
- **iOS**: Face ID, Touch ID
- **Android**: Fingerprint, Face Recognition

### Implementation
- Uses `expo-local-authentication`
- Can be enabled/disabled in Security Settings
- Required for sensitive actions (optional)

### Usage
```typescript
import { useBiometricAuth } from '../hooks/useBiometricAuth';

const { requireBiometricAuth } = useBiometricAuth();

// Require biometric before sensitive action
await requireBiometricAuth(
  async () => {
    // Perform sensitive action
  },
  'Authenticate to continue'
);
```

## SSL Certificate Pinning

### Status
SSL certificate pinning requires native code configuration and is not yet implemented in this Expo app.

### Implementation Notes
To implement SSL pinning:

1. **For Expo Managed Workflow**: Use `expo-ssl-pinning` or eject to bare workflow
2. **For Bare React Native**: Use `react-native-ssl-pinning` or native certificate pinning

### Configuration Required
- Add server certificate to app bundle
- Configure pinning in native code
- Update certificates when server certificates rotate

### Current Protection
- HTTPS is enforced for all API calls
- Certificate validation is handled by the OS
- Consider implementing pinning for production

## Screenshot Prevention

### Implementation
- Uses native `FLAG_SECURE` on Android
- Uses iOS screenshot prevention APIs
- Applied to sensitive screens:
  - Login/Register screens
  - Financial information screens
  - Authentication screens

### Usage
```typescript
import { ScreenshotPrevention } from '../utils/screenshotPrevention';

<ScreenshotPrevention enabled={true}>
  {/* Sensitive screen content */}
</ScreenshotPrevention>
```

### Note
Screenshot prevention requires native code configuration:
- **Android**: Add `FLAG_SECURE` to MainActivity
- **iOS**: Configure in AppDelegate

## Jailbreak/Root Detection

### Detection
- Uses `react-native-device-info` to detect compromised devices
- Checks for jailbreak (iOS) or root (Android)
- Warns users but allows continuation (configurable)

### Warning Screen
- Shows security warning on compromised devices
- User can choose to continue or exit
- Can be configured to block app usage entirely

### Usage
```typescript
import JailbreakWarning from '../components/security/JailbreakWarning';

<JailbreakWarning
  allowContinue={true} // Set to false to block usage
  onExit={() => {/* Handle exit */}}
/>
```

## Session Management

### Auto Logout
- **Inactivity Timeout**: 30 minutes of inactivity
- **Activity Tracking**: Tracks user interactions
- **Automatic Logout**: Signs out user when session expires

### Logout on App Close
- Optional setting in Security Settings
- Clears all tokens when app is closed
- Provides additional security layer

### Session Tracking
- Last activity time stored securely
- Checked periodically (every minute)
- Automatically signs out on expiry

## Secure Input

### SecureTextInput Component
- Uses `secureTextEntry` for passwords
- Disables autocomplete on sensitive fields
- Clears clipboard after paste (optional)
- Prevents password managers from auto-filling

### Features
- **Clipboard Clearing**: Automatically clears clipboard 30 seconds after paste
- **AutoComplete Disabled**: Prevents browser/OS autocomplete
- **Secure Entry**: Uses secure text entry mode

### Usage
```typescript
import SecureTextInput from '../components/security/SecureTextInput';

<SecureTextInput
  label="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={true}
  clearClipboardOnPaste={true}
/>
```

## Security Settings

Access security settings from Profile → Security Settings:

- **Biometric Authentication**: Enable/disable Face ID/Touch ID
- **Session Management**: Configure auto-logout and logout on close
- **Device Security**: View device security status
- **Security Features**: View enabled security features

## Best Practices

### For Developers

1. **Always use SecureTextInput** for passwords and sensitive data
2. **Use SecureStorage** for all sensitive data (never AsyncStorage)
3. **Require biometric auth** for sensitive actions (optional)
4. **Wrap sensitive screens** with ScreenshotPrevention
5. **Clear clipboard** after pasting sensitive data

### For Users

1. **Enable biometric authentication** for additional security
2. **Keep app updated** to receive security patches
3. **Use secure devices** - avoid jailbroken/rooted devices
4. **Enable logout on close** for maximum security
5. **Don't share your device** with others

## Security Checklist

- [x] Secure storage (expo-secure-store)
- [x] Token management with auto-refresh
- [x] Biometric authentication
- [x] Screenshot prevention (requires native code)
- [x] Jailbreak/root detection
- [x] Session management
- [x] Secure input components
- [ ] SSL certificate pinning (requires native code)

## Native Code Requirements

Some security features require native code configuration:

1. **Screenshot Prevention**:
   - Android: Add `FLAG_SECURE` to MainActivity
   - iOS: Configure in AppDelegate

2. **SSL Certificate Pinning**:
   - Requires native module or Expo config plugin
   - Certificate must be bundled with app

## References

- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo LocalAuthentication Documentation](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [React Native Device Info](https://github.com/react-native-device-info/react-native-device-info)
