// This is an Expo-compatible version using firebase package
// Use this if you're using Expo Go or standard Expo builds
// To use: Rename this file to authService.ts (backup the original first)

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiClient } from '../config/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  timezone: string;
  isVerified: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  timezone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  timezone?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface ProfileResponse {
  success: boolean;
  user: User;
  stats?: {
    contacts: number;
    relationships: number;
    events: number;
    savingsGoals: number;
    pendingReminders: number;
  };
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Get Firebase ID token
      const token = await firebaseUser.getIdToken();

      // Create user in backend
      const response = await apiClient.post('/auth/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        timezone: data.timezone || 'UTC',
      });

      return {
        success: true,
        user: response.data.user,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  /**
   * Login with email and password
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Get Firebase ID token
      const token = await firebaseUser.getIdToken();

      // Login to backend
      const response = await apiClient.post('/auth/login', {
        token,
      });

      return {
        success: true,
        user: response.data.user,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  /**
   * Login with Google
   * Note: Requires expo-auth-session or similar
   */
  async loginWithGoogle(): Promise<AuthResponse> {
    throw new Error('Google Sign-In not configured. See AUTH_SETUP.md for setup instructions.');
  }

  /**
   * Login with Apple
   * Note: Requires expo-apple-authentication (iOS only)
   */
  async loginWithApple(): Promise<AuthResponse> {
    throw new Error('Apple Sign-In not configured. See AUTH_SETUP.md for setup instructions.');
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  }

  /**
   * Refresh Firebase token
   */
  async refreshToken(): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }
      return await user.getIdToken(true);
    } catch (error: any) {
      throw new Error(error.message || 'Token refresh failed');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<ProfileResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const token = await user.getIdToken();
      const response = await apiClient.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get profile');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<AuthResponse> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const token = await user.getIdToken();
      const response = await apiClient.put(
        '/auth/profile',
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: true,
        user: response.data.user,
        message: response.data.message,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const token = await user.getIdToken();
      await apiClient.delete('/auth/account', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await user.delete();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete account');
    }
  }

  /**
   * Export user data
   */
  async exportData(): Promise<any> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      const token = await user.getIdToken();
      const response = await apiClient.get('/auth/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to export data');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }
}

export const authService = new AuthService();
