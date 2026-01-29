import { Prisma, User } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateUserData {
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  timezone?: string;
  notificationPreferences?: Prisma.JsonValue;
  isVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  timezone?: string;
  passwordHash?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(data: CreateUserData): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          profileImage: data.profileImage,
          timezone: data.timezone ?? 'UTC',
          notificationPreferences: data.notificationPreferences ?? {
            email: true,
            push: true,
            sms: false,
          },
          isVerified: data.isVerified ?? false,
          isActive: data.isActive ?? true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('User with this email already exists');
        }
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      return user;
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      return user;
    } catch (error) {
      throw new Error(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user
   */
  static async updateUser(id: string, data: UpdateUserData): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('User not found');
        }
      }
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Soft delete user (set isActive to false)
   */
  static async deleteUser(id: string): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('User not found');
        }
      }
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    id: string,
    preferences: Prisma.InputJsonValue
  ): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          notificationPreferences: preferences,
          updatedAt: new Date(),
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('User not found');
        }
      }
      throw new Error(
        `Failed to update notification preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
