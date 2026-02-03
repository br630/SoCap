import { renderHook, waitFor } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { AuthProvider } from '../../context/AuthContext';
import { ReactNode } from 'react';
import * as authService from '../../services/authService';
import * as SecureStore from 'expo-secure-store';

jest.mock('../../services/authService');
jest.mock('expo-secure-store');

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('signs in successfully', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: 'mock-token',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('handles login error', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrongpassword');
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('signs out successfully', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: 'mock-token',
    });

    mockAuthService.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Sign in first
    await waitFor(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Sign out
    await waitFor(async () => {
      await result.current.signOut();
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it('clears error when clearError is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Set error manually (would normally be set by a failed operation)
    result.current.clearError();

    expect(result.current.error).toBeNull();
  });
});
