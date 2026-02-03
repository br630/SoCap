import { prisma } from '../lib/prisma';

/**
 * Authentication Security Service
 * Handles account lockout, password requirements, and token rotation
 */

interface FailedLoginAttempt {
  count: number;
  lastAttempt: Date;
  lockoutUntil?: Date;
}

// In-memory store for failed login attempts
// In production, use Redis or database
const failedLoginAttempts = new Map<string, FailedLoginAttempt>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if account is locked
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const attempt = failedLoginAttempts.get(email);
  
  if (!attempt || !attempt.lockoutUntil) {
    return false;
  }

  if (new Date() < attempt.lockoutUntil) {
    return true;
  }

  // Lockout expired, clear it
  failedLoginAttempts.delete(email);
  return false;
}

/**
 * Record failed login attempt
 */
export async function recordFailedLoginAttempt(email: string): Promise<{
  isLocked: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
}> {
  const attempt = failedLoginAttempts.get(email) || {
    count: 0,
    lastAttempt: new Date(),
  };

  attempt.count += 1;
  attempt.lastAttempt = new Date();

  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    attempt.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    failedLoginAttempts.set(email, attempt);
    
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutUntil: attempt.lockoutUntil,
    };
  }

  failedLoginAttempts.set(email, attempt);

  return {
    isLocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - attempt.count,
  };
}

/**
 * Clear failed login attempts (on successful login)
 */
export async function clearFailedLoginAttempts(email: string): Promise<void> {
  failedLoginAttempts.delete(email);
}

/**
 * Password complexity requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Validate password against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Token rotation tracking
 * Tracks when tokens should be rotated for sensitive operations
 */
const tokenRotationRequired = new Set<string>();

/**
 * Mark token for rotation (after sensitive operation)
 */
export function markTokenForRotation(userId: string): void {
  tokenRotationRequired.add(userId);
}

/**
 * Check if token rotation is required
 */
export function isTokenRotationRequired(userId: string): boolean {
  return tokenRotationRequired.has(userId);
}

/**
 * Clear token rotation requirement
 */
export function clearTokenRotationRequirement(userId: string): void {
  tokenRotationRequired.delete(userId);
}

/**
 * Get account lockout status
 */
export async function getAccountLockoutStatus(email: string): Promise<{
  isLocked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockoutUntil?: Date;
}> {
  const attempt = failedLoginAttempts.get(email);
  
  if (!attempt) {
    return {
      isLocked: false,
      failedAttempts: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  const isLocked = attempt.lockoutUntil ? new Date() < attempt.lockoutUntil : false;

  return {
    isLocked,
    failedAttempts: attempt.count,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempt.count),
    lockoutUntil: attempt.lockoutUntil,
  };
}
