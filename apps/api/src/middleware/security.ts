import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Security middleware configuration using Helmet
 * Sets various HTTP headers to help protect the app from common vulnerabilities
 */
export function securityMiddleware() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: isDevelopment ? [] : [], // Enable in production
      },
    },
    // X-Frame-Options: Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // X-Content-Type-Options: Prevent MIME type sniffing
    noSniff: true,
    // X-XSS-Protection: Enable XSS filter
    xssFilter: true,
    // Referrer-Policy: Control referrer information
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // Permissions-Policy: Control browser features
    permittedCrossDomainPolicies: false,
    // HSTS: Force HTTPS (only in production)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // Disable DNS prefetching
    dnsPrefetchControl: true,
    // Disable IE's XSS filter (redundant with CSP)
    ieNoOpen: true,
  });
}

/**
 * Additional security headers middleware
 */
export function additionalSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // X-Permitted-Cross-Domain-Policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // X-Download-Options (IE8+)
  res.setHeader('X-Download-Options', 'noopen');

  // X-DNS-Prefetch-Control
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Expect-CT (Certificate Transparency)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Expect-CT',
      'max-age=86400, enforce, report-uri="https://example.com/report-ct"'
    );
  }

  next();
}
