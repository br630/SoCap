import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';

/**
 * Rate limit entry tracking
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for rate limiting
 */
class RateLimitStore {
  private ipStore: Map<string, RateLimitEntry> = new Map();
  private userStore: Map<string, RateLimitEntry> = new Map();

  /**
   * Clean up expired entries periodically
   */
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get client identifier (IP address or user ID)
   */
  getClientId(req: AuthenticatedRequest): { ip: string; userId?: string } {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    return {
      ip,
      userId: req.user?.uid,
    };
  }

  /**
   * Check and increment rate limit for IP address
   */
  checkIpLimit(ip: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.ipStore.get(ip);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      const resetTime = now + windowMs;
      this.ipStore.set(ip, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }

    // Increment count
    entry.count += 1;

    if (entry.count > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Check and increment rate limit for user ID
   */
  checkUserLimit(
    userId: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.userStore.get(userId);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      const resetTime = now + windowMs;
      this.userStore.set(userId, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }

    // Increment count
    entry.count += 1;

    if (entry.count > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up IP store
    for (const [ip, entry] of this.ipStore.entries()) {
      if (now > entry.resetTime) {
        this.ipStore.delete(ip);
      }
    }

    // Clean up user store
    for (const [userId, entry] of this.userStore.entries()) {
      if (now > entry.resetTime) {
        this.userStore.delete(userId);
      }
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.ipStore.clear();
    this.userStore.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create singleton instance
const rateLimitStore = new RateLimitStore();

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  /**
   * Maximum requests per IP per window (default: 100 per minute)
   */
  ipLimit?: number;
  ipWindowMs?: number;
  /**
   * Maximum requests per user per window (default: 1000 per hour)
   */
  userLimit?: number;
  userWindowMs?: number;
  /**
   * Custom message for rate limit exceeded
   */
  message?: string;
}

/**
 * Rate limiting middleware
 * 
 * Limits:
 * - 100 requests per minute per IP address
 * - 1000 requests per hour per authenticated user
 * 
 * Returns 429 Too Many Requests with Retry-After header when exceeded
 */
export function rateLimitMiddleware(config: RateLimitConfig = {}) {
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
 * Export store for testing purposes
 */
export { rateLimitStore };
