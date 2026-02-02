import { z } from 'zod';

/**
 * Register validation schema
 */
export const registerSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  timezone: z.string().optional().default('UTC'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  token: z.string().min(1, 'Firebase ID token is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Google/Apple OAuth login schema
 */
export const oauthLoginSchema = z.object({
  token: z.string().min(1, 'Firebase ID token is required'),
});

export type OAuthLoginInput = z.infer<typeof oauthLoginSchema>;

/**
 * Update profile validation schema
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long').optional(),
  profileImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
  timezone: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
