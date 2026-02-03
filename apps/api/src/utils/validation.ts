import { z } from 'zod';

/**
 * Validation utilities
 * Provides common validation schemas and sanitization functions
 */

/**
 * Sanitize string input
 * Removes potentially dangerous characters and trims whitespace
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize object strings recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Date validation schema (ISO string)
 */
export const dateSchema = z.string().datetime('Invalid date format');

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

/**
 * Phone number validation schema
 */
export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
);

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Common enum validation
 */
export function createEnumSchema<T extends string>(enumObject: Record<string, T>) {
  return z.nativeEnum(enumObject as any);
}

/**
 * Validate and sanitize request body
 */
export function validateAndSanitize<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  // First sanitize if it's an object
  const sanitized = typeof data === 'object' && data !== null
    ? sanitizeObject(data as Record<string, any>)
    : data;

  // Then validate
  return schema.parse(sanitized);
}

/**
 * Safe parse with error handling
 */
export function safeParse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
}
