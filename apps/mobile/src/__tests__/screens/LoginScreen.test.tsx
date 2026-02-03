import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../utils/testHelpers';
import LoginScreen from '../../screens/auth/LoginScreen';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('LoginScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockSignInWithApple = jest.fn();
  const mockClearError = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      refreshUser: jest.fn(),
      error: null,
      clearError: mockClearError,
    } as any);

    // Mock navigation
    require('@react-navigation/native').useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  it('renders login form correctly', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen />
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('validates email input', async () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText('Email');
    const submitButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText(/valid email/i)).toBeTruthy();
    });
  });

  it('validates password input', async () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen />
    );

    const passwordInput = getByPlaceholderText('Password');
    const submitButton = getByText('Sign In');

    fireEvent.changeText(passwordInput, 'short');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText(/at least 8 characters/i)).toBeTruthy();
    });
  });

  it('calls signIn with correct credentials', async () => {
    mockSignIn.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = renderWithProviders(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const submitButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('navigates to register screen when register link is pressed', () => {
    const { getByText } = renderWithProviders(<LoginScreen />);

    const registerLink = getByText(/don't have an account/i);
    fireEvent.press(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('shows loading state during login', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      refreshUser: jest.fn(),
      error: null,
      clearError: mockClearError,
    } as any);

    const { getByText } = renderWithProviders(<LoginScreen />);

    expect(getByText(/loading/i)).toBeTruthy();
  });

  it('displays error message when login fails', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      refreshUser: jest.fn(),
      error: 'Invalid credentials',
      clearError: mockClearError,
    } as any);

    const { getByText } = renderWithProviders(<LoginScreen />);

    expect(getByText('Invalid credentials')).toBeTruthy();
  });
});
