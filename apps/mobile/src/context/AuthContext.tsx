import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';
import { authService, User } from '../services/authService';
import { setTokenGetter } from '../config/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'auth_user';
const TOKEN_STORAGE_KEY = 'auth_token';

// Cross-platform storage wrapper so that web does not rely on expo-secure-store
const secureStore = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors on web
        }
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore storage errors on native; auth will still work, just not persist
    }
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore
    }
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up token getter for API client
  useEffect(() => {
    setTokenGetter(async () => {
      return secureStore.getItem(TOKEN_STORAGE_KEY);
    });
  }, []);

  // Load persisted auth state on mount
  useEffect(() => {
    loadPersistedAuth();
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Get fresh token
          const token = await firebaseUser.getIdToken();
          await secureStore.setItem(TOKEN_STORAGE_KEY, token);

          // Load user profile from backend
          await refreshUser();
        } catch (err) {
          console.error('Error handling auth state change:', err);
          await signOut();
        }
      } else {
        // User signed out
        setUser(null);
        await secureStore.deleteItem(TOKEN_STORAGE_KEY);
        await secureStore.deleteItem(AUTH_STORAGE_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-refresh token every 50 minutes (tokens expire after 1 hour)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken(true); // Force refresh
          await secureStore.setItem(TOKEN_STORAGE_KEY, token);
        }
      } catch (err) {
        console.error('Error refreshing token:', err);
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  /**
   * Load persisted auth state from SecureStore
   */
  const loadPersistedAuth = async () => {
    try {
      const storedUser = await secureStore.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Error loading persisted auth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Persist user to SecureStore
   */
  const persistUser = async (userData: User) => {
    try {
      await secureStore.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error('Error persisting user:', err);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.login({ email, password });
      await persistUser(response.user);
    } catch (err: any) {
      const errorMessage = err.message || 'Sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });
      await persistUser(response.user);
    } catch (err: any) {
      const errorMessage = err.message || 'Sign up failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      await secureStore.deleteItem(TOKEN_STORAGE_KEY);
      await secureStore.deleteItem(AUTH_STORAGE_KEY);
    } catch (err: any) {
      const errorMessage = err.message || 'Sign out failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.loginWithGoogle();
      await persistUser(response.user);
    } catch (err: any) {
      const errorMessage = err.message || 'Google sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with Apple
   */
  const signInWithApple = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.loginWithApple();
      await persistUser(response.user);
    } catch (err: any) {
      const errorMessage = err.message || 'Apple sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user profile from backend
   */
  const refreshUser = async () => {
    try {
      const response = await authService.getProfile();
      await persistUser(response.user);
    } catch (err) {
      console.error('Error refreshing user:', err);
      // Don't throw - user might still be authenticated
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    refreshUser,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
