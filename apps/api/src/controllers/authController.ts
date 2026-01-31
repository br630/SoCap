import { Request, Response } from 'express';
import { z } from 'zod';
import { createUser as createFirebaseUser, deleteUser as deleteFirebaseUser, verifyIdToken } from '../config/firebase';
import { UserService } from '../services/userService';
import { ContactService } from '../services/contactService';
import { RelationshipService } from '../services/relationshipService';
import { EventService } from '../services/eventService';
import { SavingsService } from '../services/savingsService';
import { ReminderService } from '../services/reminderService';
import { AuthenticatedRequest } from '../types/express';
import {
  registerSchema,
  loginSchema,
  oauthLoginSchema,
  updateProfileSchema,
  RegisterInput,
  LoginInput,
  OAuthLoginInput,
  UpdateProfileInput,
} from '../validators/authValidators';
import { prisma } from '../lib/prisma';
import { FirebaseUserCreationError, FirebaseTokenError } from '../errors/firebaseErrors';

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    console.log('Registration request received:', {
      email: req.body.email,
      firstName: req.body.firstName,
    });
    
    // Validate input
    const validatedData: RegisterInput = registerSchema.parse(req.body);

    // Create Firebase user
    let firebaseUser;
    try {
      firebaseUser = await createFirebaseUser(
        validatedData.email,
        validatedData.password,
        {
          displayName: `${validatedData.firstName} ${validatedData.lastName}`,
          emailVerified: false,
        }
      );
    } catch (error) {
      if (error instanceof FirebaseUserCreationError) {
        res.status(400).json({
          error: 'Registration failed',
          message: error.message,
        });
        return;
      }
      throw error;
    }

    // Create local User record
    try {
      console.log('Creating local user for:', validatedData.email);
      const localUser = await UserService.createUser({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        timezone: validatedData.timezone,
        isVerified: false,
        isActive: true,
      });
      console.log('Local user created successfully:', localUser.id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: localUser.id,
          email: localUser.email,
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          firebaseUid: firebaseUser.uid,
        },
      });
    } catch (error) {
      console.error('Failed to create local user:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // If local user creation fails, clean up Firebase user
      try {
        console.log('Cleaning up Firebase user:', firebaseUser.uid);
        await deleteFirebaseUser(firebaseUser.uid);
        console.log('Firebase user cleaned up successfully');
      } catch (deleteError) {
        console.error('Failed to clean up Firebase user after local user creation failure:', deleteError);
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: 'Registration failed',
          message: 'User with this email already exists',
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.issues,
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
}

/**
 * Login with Firebase token
 * POST /auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData: LoginInput = loginSchema.parse(req.body);

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(validatedData.token);
    } catch (error) {
      if (error instanceof FirebaseTokenError) {
        res.status(401).json({
          error: 'Authentication failed',
          message: error.message,
        });
        return;
      }
      throw error;
    }

    // Get or create local User record
    let localUser = await UserService.getUserByEmail(decodedToken.email || '');

    if (!localUser) {
      // Create local user if doesn't exist
      const displayName = decodedToken.name || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      localUser = await UserService.createUser({
        email: decodedToken.email || '',
        firstName: firstName || 'User',
        lastName: lastName || '',
        profileImage: decodedToken.picture,
        isVerified: decodedToken.email_verified || false,
        isActive: true,
      });
    }

    res.json({
      success: true,
      user: {
        id: localUser.id,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profileImage: localUser.profileImage,
        timezone: localUser.timezone,
        isVerified: localUser.isVerified,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.issues,
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
}

/**
 * Google OAuth login
 * POST /auth/google
 */
export async function googleLogin(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData: OAuthLoginInput = oauthLoginSchema.parse(req.body);

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(validatedData.token);
    } catch (error) {
      if (error instanceof FirebaseTokenError) {
        res.status(401).json({
          error: 'Authentication failed',
          message: error.message,
        });
        return;
      }
      throw error;
    }

    // Verify it's a Google provider token
    if (decodedToken.firebase.sign_in_provider !== 'google.com') {
      res.status(400).json({
        error: 'Invalid provider',
        message: 'Token is not from Google OAuth',
      });
      return;
    }

    // Get or create local User record
    let localUser = await UserService.getUserByEmail(decodedToken.email || '');

    if (!localUser) {
      const displayName = decodedToken.name || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      localUser = await UserService.createUser({
        email: decodedToken.email || '',
        firstName: firstName || 'User',
        lastName: lastName || '',
        profileImage: decodedToken.picture,
        isVerified: decodedToken.email_verified || false,
        isActive: true,
      });
    } else {
      // Update profile image if available
      if (decodedToken.picture && decodedToken.picture !== localUser.profileImage) {
        await UserService.updateUser(localUser.id, {
          profileImage: decodedToken.picture,
        });
        localUser.profileImage = decodedToken.picture;
      }
    }

    res.json({
      success: true,
      user: {
        id: localUser.id,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profileImage: localUser.profileImage,
        timezone: localUser.timezone,
        isVerified: localUser.isVerified,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.issues,
      });
      return;
    }

    console.error('Google login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate with Google',
    });
  }
}

/**
 * Apple Sign-In login
 * POST /auth/apple
 */
export async function appleLogin(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData: OAuthLoginInput = oauthLoginSchema.parse(req.body);

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(validatedData.token);
    } catch (error) {
      if (error instanceof FirebaseTokenError) {
        res.status(401).json({
          error: 'Authentication failed',
          message: error.message,
        });
        return;
      }
      throw error;
    }

    // Verify it's an Apple provider token
    if (decodedToken.firebase.sign_in_provider !== 'apple.com') {
      res.status(400).json({
        error: 'Invalid provider',
        message: 'Token is not from Apple Sign-In',
      });
      return;
    }

    // Get or create local User record
    let localUser = await UserService.getUserByEmail(decodedToken.email || '');

    if (!localUser) {
      const displayName = decodedToken.name || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      localUser = await UserService.createUser({
        email: decodedToken.email || '',
        firstName: firstName || 'User',
        lastName: lastName || '',
        profileImage: decodedToken.picture,
        isVerified: decodedToken.email_verified || false,
        isActive: true,
      });
    } else {
      // Update profile image if available
      if (decodedToken.picture && decodedToken.picture !== localUser.profileImage) {
        await UserService.updateUser(localUser.id, {
          profileImage: decodedToken.picture,
        });
        localUser.profileImage = decodedToken.picture;
      }
    }

    res.json({
      success: true,
      user: {
        id: localUser.id,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profileImage: localUser.profileImage,
        timezone: localUser.timezone,
        isVerified: localUser.isVerified,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.issues,
      });
      return;
    }

    console.error('Apple login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate with Apple',
    });
  }
}

/**
 * Get current user profile with stats
 * GET /auth/profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const userId = req.user.uid;

    // Get local user by email
    const localUser = await UserService.getUserByEmail(req.user.email || '');

    if (!localUser) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found',
      });
      return;
    }

    // Get user stats
    const [contacts, relationships, events, savingsGoals, reminders] = await Promise.all([
      prisma.contact.count({ where: { userId: localUser.id, isDeleted: false } }),
      prisma.relationship.count({ where: { userId: localUser.id } }),
      prisma.event.count({ where: { userId: localUser.id } }),
      prisma.savingsGoal.count({ where: { userId: localUser.id } }),
      prisma.reminder.count({ where: { userId: localUser.id, status: 'PENDING' } }),
    ]);

    res.json({
      success: true,
      user: {
        id: localUser.id,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profileImage: localUser.profileImage,
        timezone: localUser.timezone,
        isVerified: localUser.isVerified,
        createdAt: localUser.createdAt,
        updatedAt: localUser.updatedAt,
      },
      stats: {
        contacts,
        relationships,
        events,
        savingsGoals,
        pendingReminders: reminders,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user profile',
    });
  }
}

/**
 * Update user profile
 * PUT /auth/profile
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    // Validate input
    const validatedData: UpdateProfileInput = updateProfileSchema.parse(req.body);

    // Get local user
    const localUser = await UserService.getUserByEmail(req.user.email || '');

    if (!localUser) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found',
      });
      return;
    }

    // Update user
    const updateData: any = {};
    if (validatedData.firstName !== undefined) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined) updateData.lastName = validatedData.lastName;
    if (validatedData.profileImage !== undefined) {
      updateData.profileImage = validatedData.profileImage === '' ? undefined : validatedData.profileImage;
    }
    if (validatedData.timezone !== undefined) updateData.timezone = validatedData.timezone;

    const updatedUser = await UserService.updateUser(localUser.id, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profileImage: updatedUser.profileImage,
        timezone: updatedUser.timezone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.issues,
      });
      return;
    }

    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
}

/**
 * Delete user account (GDPR compliance)
 * DELETE /auth/account
 */
export async function deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const userId = req.user.uid;
    const localUser = await UserService.getUserByEmail(req.user.email || '');

    if (!localUser) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found',
      });
      return;
    }

    // Delete all user data (cascade will handle related records)
    // Prisma will cascade delete based on schema relationships
    await prisma.user.delete({
      where: { id: localUser.id },
    });

    // Delete Firebase user
    try {
      await deleteFirebaseUser(userId);
    } catch (error) {
      console.error('Failed to delete Firebase user:', error);
      // Continue even if Firebase deletion fails
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete account',
    });
  }
}

/**
 * Export user data (GDPR compliance)
 * GET /auth/export
 */
export async function exportData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const localUser = await UserService.getUserByEmail(req.user.email || '');

    if (!localUser) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found',
      });
      return;
    }

    // Gather all user data
    const [
      contacts,
      relationships,
      events,
      savingsGoals,
      reminders,
      interactions,
      transactions,
    ] = await Promise.all([
      prisma.contact.findMany({
        where: { userId: localUser.id },
        include: {
          relationships: true,
          eventAttendees: true,
        },
      }),
      prisma.relationship.findMany({
        where: { userId: localUser.id },
        include: {
          contact: true,
          interactions: true,
        },
      }),
      prisma.event.findMany({
        where: { userId: localUser.id },
        include: {
          attendees: {
            include: {
              contact: true,
            },
          },
          savingsGoals: true,
        },
      }),
      prisma.savingsGoal.findMany({
        where: { userId: localUser.id },
        include: {
          transactions: true,
          event: true,
        },
      }),
      prisma.reminder.findMany({
        where: { userId: localUser.id },
        include: {
          contact: true,
          event: true,
        },
      }),
      prisma.interaction.findMany({
        where: {
          relationship: {
            userId: localUser.id,
          },
        },
        include: {
          relationship: {
            include: {
              contact: true,
            },
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          savingsGoal: {
            userId: localUser.id,
          },
        },
        include: {
          savingsGoal: true,
        },
      }),
    ]);

    // Compile export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: localUser.id,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profileImage: localUser.profileImage,
        timezone: localUser.timezone,
        notificationPreferences: localUser.notificationPreferences,
        isVerified: localUser.isVerified,
        isActive: localUser.isActive,
        createdAt: localUser.createdAt,
        updatedAt: localUser.updatedAt,
      },
      contacts,
      relationships,
      events,
      savingsGoals,
      reminders,
      interactions,
      transactions,
    };

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${localUser.id}-${Date.now()}.json"`);

    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export user data',
    });
  }
}
