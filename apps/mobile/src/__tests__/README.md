# Testing Guide - Mobile App

This directory contains comprehensive tests for the SoCap mobile application.

## Test Structure

```
__tests__/
├── setup.ts                 # Global test setup and mocks
├── utils/
│   └── testHelpers.tsx      # Test utilities and render helpers
├── mocks/
│   └── services.ts          # Mock service implementations
├── components/              # Component tests
│   ├── ContactCard.test.tsx
│   ├── HealthScoreCard.test.tsx
│   └── SecureTextInput.test.tsx
├── hooks/                   # Hook tests
│   ├── useAuth.test.ts
│   └── useContacts.test.ts
└── screens/                 # Screen tests
    └── LoginScreen.test.tsx

e2e/                         # End-to-end tests (Detox)
├── jest.config.js
├── registration.test.js
├── addContact.test.js
└── createEvent.test.js
```

## Running Tests

### Unit & Integration Tests (Jest)

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E Tests (Detox)

**Prerequisites:**
- iOS: Xcode installed, iOS Simulator available
- Android: Android Studio installed, Android Emulator or device connected

**Build and Run:**

```bash
# iOS
npm run test:e2e:ios:build    # Build app first
npm run test:e2e:ios          # Run tests

# Android
npm run test:e2e:android:build  # Build app first
npm run test:e2e:android        # Run tests
```

## Test Utilities

### renderWithProviders

Custom render function that includes all necessary providers:

```typescript
import { renderWithProviders } from '../utils/testHelpers';

const { getByText } = renderWithProviders(
  <MyComponent />
);
```

### Mock Data Factories

```typescript
import { mockContact, mockUser, mockEvent } from '../utils/testHelpers';

const contact = mockContact;
const user = mockUser;
const event = mockEvent;
```

### Mock Services

```typescript
import { createMockContactService, createMockAuthService } from '../mocks/services';

const mockContactService = createMockContactService();
mockContactService.getContacts.mockResolvedValue(mockData);
```

## Writing Tests

### Component Tests

```typescript
import React from 'react';
import { renderWithProviders, fireEvent } from '../utils/testHelpers';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithProviders(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('handles user interaction', () => {
    const mockOnPress = jest.fn();
    const { getByText } = renderWithProviders(
      <MyComponent onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Button'));
    expect(mockOnPress).toHaveBeenCalled();
  });
});
```

### Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMyHook } from '../../hooks/useMyHook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.data).toBeNull();
  });

  it('fetches data', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

### Screen Tests

```typescript
import { renderWithProviders, fireEvent, waitFor } from '../utils/testHelpers';
import LoginScreen from '../../screens/auth/LoginScreen';

describe('LoginScreen', () => {
  it('validates form inputs', async () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen />
    );
    
    fireEvent.changeText(getByPlaceholderText('Email'), 'invalid');
    fireEvent.press(getByText('Sign In'));
    
    await waitFor(() => {
      expect(getByText(/valid email/i)).toBeTruthy();
    });
  });
});
```

### E2E Tests

```javascript
describe('Feature Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete user flow', async () => {
    await element(by.id('button')).tap();
    await expect(element(by.id('screen'))).toBeVisible();
  });
});
```

## Mocking

### Native Modules

Native modules are automatically mocked in `setup.ts`. To add custom mocks:

```typescript
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('value')),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));
```

### Navigation

Navigation is mocked by default. To customize:

```typescript
const mockNavigate = jest.fn();
require('@react-navigation/native').useNavigation.mockReturnValue({
  navigate: mockNavigate,
});
```

### API Services

Mock API services in your tests:

```typescript
jest.mock('../../services/contactService');
const mockContactService = contactService as jest.Mocked<typeof contactService>;
mockContactService.getContacts.mockResolvedValue(mockData);
```

## Best Practices

1. **Use renderWithProviders**: Always use the custom render function to ensure all providers are available
2. **Clean up mocks**: Clear mocks in `beforeEach` hooks
3. **Test user interactions**: Use `fireEvent` to simulate user actions
4. **Wait for async operations**: Use `waitFor` for async state updates
5. **Test error states**: Include tests for error handling
6. **Test edge cases**: Cover boundary conditions and edge cases
7. **Keep tests focused**: Each test should test one specific behavior
8. **Use descriptive names**: Test names should clearly describe what is being tested

## Coverage Goals

Target coverage: **60%+**

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that mocks are properly set up in `setup.ts`

### E2E tests not running
- Ensure app is built: `npm run test:e2e:ios:build`
- Check that simulator/emulator is running
- Verify Detox configuration matches your setup

### Async operations timing out
- Increase timeout: `jest.setTimeout(10000)`
- Use `waitFor` for async state updates
- Check that mocks are returning promises correctly

### Navigation not working in tests
- Ensure navigation mocks are set up correctly
- Use `renderWithProviders` which includes NavigationContainer
