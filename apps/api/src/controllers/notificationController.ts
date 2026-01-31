import { Response } from 'express';
import { z } from 'zod';
import { NotificationService } from '../services/notificationService';
import { AuthenticatedRequest } from '../types/express';
import { DevicePlatform } from '@prisma/client';

const registerDeviceSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.nativeEnum(DevicePlatform),
});

const unregisterDeviceSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * Register device token for push notifications
 * POST /notifications/register-device
 */
export async function registerDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { UserService } = await import('../services/userService');
    const localUser = await UserService.getUserByEmail(req.user!.email || '');
    if (!localUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const localUserId = localUser.id;
    const validated = registerDeviceSchema.parse(req.body);

    await NotificationService.registerDeviceToken(
      localUserId,
      validated.token,
      validated.platform
    );

    res.json({
      success: true,
      message: 'Device registered successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Register device error:', error);
    res.status(500).json({
      error: 'Failed to register device',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Unregister device token
 * DELETE /notifications/unregister-device
 */
export async function unregisterDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { UserService } = await import('../services/userService');
    const localUser = await UserService.getUserByEmail(req.user!.email || '');
    if (!localUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const localUserId = localUser.id;
    const validated = unregisterDeviceSchema.parse(req.body);

    await NotificationService.removeDeviceToken(localUserId, validated.token);

    res.json({
      success: true,
      message: 'Device unregistered successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        issues: error.issues,
      });
      return;
    }

    console.error('Unregister device error:', error);
    res.status(500).json({
      error: 'Failed to unregister device',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
