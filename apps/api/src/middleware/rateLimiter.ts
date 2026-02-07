import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * General API rate limit
 * More lenient in development for testing
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // 1000 requests in dev, 100 in prod
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict limit for auth endpoints
 * More lenient in development
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10, // 100 attempts in dev, 10 in prod
  message: 'Too many authentication attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, including successful ones
});

/**
 * AI endpoints (expensive operations)
 * More lenient in development
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 500 : 50, // 500 requests in dev, 50 in prod
  message: 'AI rate limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Legacy exports for backward compatibility
 * These map to the new limiters
 */
export const apiRateLimiter = apiLimiter;
export const authRateLimiter = authLimiter;
