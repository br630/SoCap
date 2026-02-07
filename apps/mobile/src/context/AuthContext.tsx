import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as SecureStore from 'expo-secure-store';
import { authService, User } from '../services/authService';
import { setTokenGetter } from '../config/api';
import tokenService from '../services/tokenService';
import sessionService from '../services/sessionService';
import secureStorage from '../services/secureStorage';

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

  // Set up token getter for API client (uses token service for auto-refresh)
  useEffect(() => {
    setTokenGetter(async () => {
      try {
        const token = await tokenService.getAccessToken();
        if (!token && process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Token getter called but no token available');
        }
        return token;
      } catch (error) {
        console.error('❌ Error in token getter:', error);
        return null;
      }
    });
  }, []);

  // Start token refresh listener
  useEffect(() => {
    if (user) {
      const cleanup = tokenService.startTokenRefreshListener();
      return cleanup;
    }
  }, [user]);

  // Initialize session management
  useEffect(() => {
    if (user) {
      sessionService.initialize(() => {
        // Session expired - sign out
        signOut();
      });
      sessionService.resetSession();

      return () => {
        sessionService.clearSession();
      };
    }
  }, [user]);

  // Load persisted auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      await loadPersistedAuth();
      
      // If user is persisted, ensure token is available
      const storedUser = await secureStore.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          try {
            // Ensure token is stored for API calls
            const token = await firebaseUser.getIdToken();
            await tokenService.storeTokens(token, undefined, 3600);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Token stored on app initialization');
            }
          } catch (error) {
            console.error('Error storing token on initialization:', error);
          }
        }
      }
    };
    
    initializeAuth();
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Get fresh token and store using token service
          const token = await firebaseUser.getIdToken();
          await tokenService.storeTokens(token, undefined, 3600); // 1 hour expiry

          // Load user profile from backend
          // If user doesn't exist in local DB, this will fail silently
          // User should sign up to create account in both Firebase and local DB
          await refreshUser();
        } catch (err: any) {
          // If user doesn't exist in local DB, sign them out from Firebase
          // This forces them to sign up fresh, which creates user in both systems
          const errorMessage = err?.message || 'Unknown error';
          
          if (errorMessage.includes('Failed to get user profile') || 
              errorMessage.includes('User not found') ||
              errorMessage.includes('404')) {
            // User exists in Firebase but not in local DB - sign them out
            console.log('User not found in local database. Please sign up to create account.');
            await signOut();
          } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
            // Network errors - don't sign out, just log
            console.warn('Network error refreshing user, will retry on next action');
          } else {
            console.error('Error handling auth state change:', errorMessage);
            // Only sign out on critical auth errors
            if (errorMessage.includes('auth') || errorMessage.includes('token')) {
              await signOut();
            }
          }
        }
      } else {
        // User signed out - clear all secure storage
        setUser(null);
        await tokenService.clearTokens();
        await secureStorage.clearAll();
        await sessionService.clearSession();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Token refresh is now handled by tokenService.startTokenRefreshListener()

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
      
      // Immediately store the token after login to prevent race conditions
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await tokenService.storeTokens(token, undefined, 3600);
      }
      
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
      
      // Immediately store the token after signup to prevent race conditions
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await tokenService.storeTokens(token, undefined, 3600);
      }
      
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
      // Clear all secure storage
      await tokenService.clearTokens();
      await secureStorage.clearAll();
      await sessionService.clearSession();
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
      
      // Immediately store the token after Google sign in
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await tokenService.storeTokens(token, undefined, 3600);
      }
      
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
      
      // Immediately store the token after Apple sign in
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await tokenService.storeTokens(token, undefined, 3600);
      }
      
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
      // Check if there's a Firebase user before attempting to refresh
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        // No user logged in, this is expected - don't log as error
        return;
      }

      const response = await authService.getProfile();
      await persistUser(response.user);
    } catch (err: any) {
      // Re-throw the error so the caller can handle it appropriately
      // (e.g., sign out if user doesn't exist in local DB)
      throw err;
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
