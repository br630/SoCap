import { AppState, AppStateStatus } from 'react-native';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import tokenService from './tokenService';

const LAST_ACTIVITY_KEY = 'last_activity';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LOGOUT_ON_CLOSE_KEY = 'logout_on_close';

/**
 * Session Service
 * Manages user sessions, inactivity timeout, and auto-logout
 */
class SessionService {
  private activityListeners: Set<() => void> = new Set();
  private lastActivityTime: number = Date.now();
  private sessionTimeoutTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize session management
   */
  async initialize(onSessionExpired: () => void): Promise<void> {
    // Load last activity time
    const lastActivity = await SecureStore.getItemAsync(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      this.lastActivityTime = parseInt(lastActivity, 10);
    }

    // Check if session expired while app was closed
    if (await this.isSessionExpired()) {
      onSessionExpired();
      return;
    }

    // Start tracking activity
    this.startActivityTracking();
    this.startSessionTimeout(onSessionExpired);

    // Listen to app state changes
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App became active - check session
        this.checkSession(onSessionExpired);
        this.updateActivity();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background
        this.saveActivity();
        
        // Check if logout on close is enabled
        this.checkLogoutOnClose();
      }
    });
  }

  /**
   * Update last activity time
   */
  updateActivity(): void {
    this.lastActivityTime = Date.now();
    SecureStore.setItemAsync(LAST_ACTIVITY_KEY, this.lastActivityTime.toString()).catch(
      (error) => console.error('Error saving activity:', error)
    );
  }

  /**
   * Save activity time
   */
  async saveActivity(): Promise<void> {
    try {
      await SecureStore.setItemAsync(LAST_ACTIVITY_KEY, this.lastActivityTime.toString());
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  }

  /**
   * Start activity tracking
   */
  startActivityTracking(): void {
    // Track user interactions
    const trackActivity = () => {
      this.updateActivity();
    };

    // Listen to various events that indicate user activity
    // Note: In a real app, you'd hook into navigation, touch events, etc.
    this.activityListeners.add(trackActivity);
  }

  /**
   * Start session timeout timer
   */
  startSessionTimeout(onSessionExpired: () => void): void {
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
    }

    this.sessionTimeoutTimer = setInterval(async () => {
      if (await this.isSessionExpired()) {
        onSessionExpired();
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Check if session is expired
   */
  async isSessionExpired(): Promise<boolean> {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    return timeSinceActivity >= SESSION_TIMEOUT_MS;
  }

  /**
   * Check session and expire if needed
   */
  async checkSession(onSessionExpired: () => void): Promise<void> {
    if (await this.isSessionExpired()) {
      onSessionExpired();
    } else {
      this.updateActivity();
    }
  }

  /**
   * Check if logout on close is enabled
   */
  async checkLogoutOnClose(): Promise<void> {
    const logoutOnClose = await SecureStore.getItemAsync(LOGOUT_ON_CLOSE_KEY);
    if (logoutOnClose === 'true') {
      // Clear tokens when app closes
      await tokenService.clearTokens();
    }
  }

  /**
   * Enable/disable logout on app close
   */
  async setLogoutOnClose(enabled: boolean): Promise<void> {
    if (enabled) {
      await SecureStore.setItemAsync(LOGOUT_ON_CLOSE_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(LOGOUT_ON_CLOSE_KEY);
    }
  }

  /**
   * Check if logout on close is enabled
   */
  async isLogoutOnCloseEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(LOGOUT_ON_CLOSE_KEY);
    return enabled === 'true';
  }

  /**
   * Reset session (on login)
   */
  async resetSession(): Promise<void> {
    this.lastActivityTime = Date.now();
    await this.saveActivity();
  }

  /**
   * Clear session (on logout)
   */
  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(LAST_ACTIVITY_KEY);
    this.lastActivityTime = Date.now();
    
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiry(): number {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    return Math.max(0, SESSION_TIMEOUT_MS - timeSinceActivity);
  }
}

export default new SessionService();
