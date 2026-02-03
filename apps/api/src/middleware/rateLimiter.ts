import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { rateLimitStore } from './rateLimit';

/**
 * Enhanced rate limiting with endpoint-specific limits
 * Supports Redis for distributed systems (optional)
 */

interface RateLimitConfig {
  ipLimit?: number;
  ipWindowMs?: number;
  userLimit?: number;
  userWindowMs?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create rate limiter middleware with custom configuration
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const ipLimit = config.ipLimit ?? 100;
  const ipWindowMs = config.ipWindowMs ?? 60 * 1000; // 1 minute
  const userLimit = config.userLimit ?? 1000;
  const userWindowMs = config.userWindowMs ?? 60 * 60 * 1000; // 1 hour
  const message = config.message ?? 'Too many requests, please try again later';

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const { ip, userId } = rateLimitStore.getClientId(req);

    // Check IP-based rate limit
    const ipResult = rateLimitStore.checkIpLimit(ip, ipLimit, ipWindowMs);

    if (!ipResult.allowed) {
      const retryAfter = Math.ceil((ipResult.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter,
        limit: ipLimit,
        window: ipWindowMs,
      });
      return;
    }

    // Check user-based rate limit (if authenticated)
    if (userId) {
      const userResult = rateLimitStore.checkUserLimit(userId, userLimit, userWindowMs);

      if (!userResult.allowed) {
        const retryAfter = Math.ceil((userResult.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({
          error: 'Too Many Requests',
          message,
          retryAfter,
          limit: userLimit,
          window: userWindowMs,
        });
        return;
      }

      // Set rate limit headers for user
      res.setHeader('X-RateLimit-Limit', userLimit.toString());
      res.setHeader('X-RateLimit-Remaining', userResult.remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(userResult.resetTime).toISOString());
    }

    // Set rate limit headers for IP
    res.setHeader('X-RateLimit-Limit-IP', ipLimit.toString());
    res.setHeader('X-RateLimit-Remaining-IP', ipResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset-IP', new Date(ipResult.resetTime).toISOString());

    next();
  };
}

/**
 * Rate limiter for authentication endpoints (stricter limits)
 */
export const authRateLimiter = createRateLimiter({
  ipLimit: 10, // 10 requests per minute per IP
  ipWindowMs: 60 * 1000,
  userLimit: 20, // 20 requests per hour per user
  userWindowMs: 60 * 60 * 1000,
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Rate limiter for general API endpoints
 */
export const apiRateLimiter = createRateLimiter({
  ipLimit: 100, // 100 requests per minute per IP
  ipWindowMs: 60 * 1000,
  userLimit: 1000, // 1000 requests per hour per user
  userWindowMs: 60 * 60 * 1000,
});

/**
 * Rate limiter for sensitive operations (data export, account deletion, etc.)
 */
export const sensitiveOperationRateLimiter = createRateLimiter({
  ipLimit: 5, // 5 requests per hour per IP
  ipWindowMs: 60 * 60 * 1000,
  userLimit: 10, // 10 requests per day per user
  userWindowMs: 24 * 60 * 60 * 1000,
  message: 'Too many sensitive operations, please try again later',
});

/**
 * Redis-based rate limiter (optional, for distributed systems)
 * Falls back to in-memory store if Redis is not available
 */
export async function createRedisRateLimiter(config: RateLimitConfig = {}) {
  // TODO: Implement Redis-based rate limiting when Redis is available
  // For now, fall back to in-memory store
  return createRateLimiter(config);
}
