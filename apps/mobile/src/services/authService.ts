import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiClient } from '../config/api';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

// Note: For Google and Apple sign-in, you'll need to install:
// - @react-native-google-signin/google-signin (for Google)
// - @invertase/react-native-apple-authentication (for Apple, iOS only)
// For now, these are commented out and will throw errors if called
// Uncomment and configure once packages are installed

// Google Sign-In configuration (uncomment when package is installed)
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// GoogleSignin.configure({
//   webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // From Firebase Console
// });

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
      // Provide more helpful error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password');
      }
      if (error.message?.includes('network') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your internet connection and ensure the backend server is running at http://localhost:3000');
      }
      if (error.response?.status === 409) {
        throw new Error('An account with this email already exists');
      }
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later');
      }
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
      // Provide more helpful error messages
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email');
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later');
      }
      if (error.message?.includes('network') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your internet connection and ensure the backend server is running at http://localhost:3000');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials');
      }
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later');
      }
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  /**
   * Login with Google using Expo Auth Session
   * 
   * To set this up:
   * 1. Go to Firebase Console → Project Settings → Your apps → Web app
   * 2. Copy the "Web client ID" (looks like: 277931500765-xxxxx.apps.googleusercontent.com)
   * 3. Add it to your .env file as: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id
   */
  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      // Get Firebase Web Client ID from environment
      // You can find this in Firebase Console → Project Settings → Your apps → Web app
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      if (!webClientId) {
        throw new Error(
          'Google Sign-In not configured. Please add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.\n\n' +
          'To get your Web Client ID:\n' +
          '1. Go to Firebase Console → Project Settings → Your apps → Web app\n' +
          '2. Copy the "Web client ID"\n' +
          '3. Add it to apps/mobile/.env as: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id'
        );
      }

      // Create discovery document
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
      };

      // Create redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'com.socap.app',
        useProxy: true,
      });

      // Create auth request
      const request = new AuthSession.AuthRequest({
        clientId: webClientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        redirectUri,
        additionalParameters: {},
        extraParams: {},
      });

      // Prompt for authentication
      const result = await request.promptAsync(discovery);

      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          throw new Error('Google Sign-In was cancelled');
        }
        throw new Error('Google Sign-In failed. Please try again.');
      }

      // Get the ID token from the result
      const { id_token } = result.params;
      if (!id_token) {
        throw new Error('No ID token received from Google');
      }

      // Create Firebase credential
      const credential = GoogleAuthProvider.credential(id_token);
      
      // Sign in to Firebase
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      // Get Firebase ID token
      const token = await firebaseUser.getIdToken();

      // Login to backend
      const response = await apiClient.post('/auth/google', { token });

      return {
        success: true,
        user: response.data.user,
      };
    } catch (error: any) {
      // Provide more helpful error messages
      if (error.message?.includes('cancelled') || error.message?.includes('cancel')) {
        throw new Error('Google Sign-In was cancelled');
      }
      if (error.message?.includes('network') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        throw new Error('Network error. Please check your internet connection and ensure the backend server is running at http://localhost:3000');
      }
      throw new Error(error.response?.data?.message || error.message || 'Google login failed');
    }
  }

  /**
   * Login with Apple
   * Note: Requires @invertase/react-native-apple-authentication package (iOS only)
   */
  async loginWithApple(): Promise<AuthResponse> {
    try {
      // TODO: Install and configure @invertase/react-native-apple-authentication
      // For Expo, you may need to use expo-apple-authentication instead
      throw new Error('Apple Sign-In not configured. Please install @invertase/react-native-apple-authentication');
      
      // Uncomment when package is installed:
      // const { appleAuth } = require('@invertase/react-native-apple-authentication');
      // const appleAuthRequestResponse = await appleAuth.performRequest({
      //   requestedOperation: appleAuth.Operation.LOGIN,
      //   requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      // });
      // if (!appleAuthRequestResponse.identityToken) {
      //   throw new Error('Apple Sign-In failed - no identity token');
      // }
      // const appleCredential = auth.AppleAuthProvider.credential(appleAuthRequestResponse.identityToken);
      // const userCredential = await auth().signInWithCredential(appleCredential);
      // const firebaseUser = userCredential.user;
      // const token = await firebaseUser.getIdToken();
      // const response = await apiClient.post('/auth/apple', { token });
      // return { success: true, user: response.data.user };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Apple login failed');
    }
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
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }
}

export const authService = new AuthService();
