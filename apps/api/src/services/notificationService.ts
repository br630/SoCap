import admin from 'firebase-admin';
import { prisma } from '../lib/prisma';
import { DevicePlatform } from '@prisma/client';

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface BatchNotification extends PushNotification {
  token?: string;
}

export class NotificationService {
  /**
   * Initialize Firebase Admin if not already initialized
   */
  private static ensureInitialized() {
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
        });
      } else {
        throw new Error('Firebase service account not configured');
      }
    }
  }

  /**
   * Send push notification to a user
   */
  static async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: number; failure: number }> {
    try {
      this.ensureInitialized();

      const tokens = await this.getDeviceTokens(userId);
      if (tokens.length === 0) {
        return { success: 0, failure: 0 };
      }

      const messages = tokens.map((token) => ({
        token: token.token,
        notification: {
          title,
          body,
        },
        data: data
          ? Object.entries(data).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          : undefined,
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      }));

      const response = await admin.messaging().sendEach(messages);
      
      // Remove invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[idx].token);
        }
      });

      if (invalidTokens.length > 0) {
        await this.removeDeviceTokens(userId, invalidTokens);
      }

      return {
        success: response.successCount,
        failure: response.failureCount,
      };
    } catch (error) {
      console.error('Send push notification error:', error);
      throw new Error(`Failed to send push notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send batch notifications
   */
  static async sendBatchNotifications(
    notifications: BatchNotification[]
  ): Promise<{ success: number; failure: number }> {
    try {
      this.ensureInitialized();

      const messages = notifications
        .filter((n) => n.token)
        .map((notification) => ({
          token: notification.token!,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data
            ? Object.entries(notification.data).reduce((acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
              }, {} as Record<string, string>)
            : undefined,
          android: {
            priority: 'high' as const,
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        }));

      if (messages.length === 0) {
        return { success: 0, failure: 0 };
      }

      const response = await admin.messaging().sendEach(messages);
      return {
        success: response.successCount,
        failure: response.failureCount,
      };
    } catch (error) {
      console.error('Send batch notifications error:', error);
      throw new Error(`Failed to send batch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register device token for a user
   */
  static async registerDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform
  ): Promise<void> {
    try {
      // Check if token already exists
      const existing = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (existing) {
        // Update if it belongs to a different user
        if (existing.userId !== userId) {
          await prisma.deviceToken.update({
            where: { token },
            data: { userId, platform, updatedAt: new Date() },
          });
        } else {
          // Update platform if changed
          if (existing.platform !== platform) {
            await prisma.deviceToken.update({
              where: { token },
              data: { platform, updatedAt: new Date() },
            });
          }
        }
      } else {
        // Create new token
        await prisma.deviceToken.create({
          data: {
            userId,
            token,
            platform,
          },
        });
      }
    } catch (error) {
      console.error('Register device token error:', error);
      throw new Error(`Failed to register device token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove device token(s)
   */
  static async removeDeviceToken(userId: string, token: string): Promise<void>;
  static async removeDeviceToken(userId: string, tokens: string[]): Promise<void>;
  static async removeDeviceToken(userId: string, tokenOrTokens: string | string[]): Promise<void> {
    try {
      const tokens = Array.isArray(tokenOrTokens) ? tokenOrTokens : [tokenOrTokens];
      
      await prisma.deviceToken.deleteMany({
        where: {
          userId,
          token: { in: tokens },
        },
      });
    } catch (error) {
      console.error('Remove device token error:', error);
      throw new Error(`Failed to remove device token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all device tokens for a user
   */
  static async getDeviceTokens(userId: string): Promise<Array<{ token: string; platform: DevicePlatform }>> {
    try {
      const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: {
          token: true,
          platform: true,
        },
      });

      return tokens;
    } catch (error) {
      console.error('Get device tokens error:', error);
      throw new Error(`Failed to get device tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
