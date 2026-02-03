import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';

/**
 * Security headers check endpoint
 * GET /api/security/headers
 * Returns information about security headers being sent
 */
export async function checkSecurityHeaders(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const headers = {
    'Content-Security-Policy': req.headers['content-security-policy'] || 'Not set',
    'X-Frame-Options': req.headers['x-frame-options'] || 'Not set',
    'X-Content-Type-Options': req.headers['x-content-type-options'] || 'Not set',
    'X-XSS-Protection': req.headers['x-xss-protection'] || 'Not set',
    'Strict-Transport-Security': req.headers['strict-transport-security'] || 'Not set',
    'Referrer-Policy': req.headers['referrer-policy'] || 'Not set',
    'Permissions-Policy': req.headers['permissions-policy'] || 'Not set',
  };

  // Check which headers are properly configured
  const checks = {
    'Content-Security-Policy': headers['Content-Security-Policy'] !== 'Not set',
    'X-Frame-Options': headers['X-Frame-Options'] !== 'Not set',
    'X-Content-Type-Options': headers['X-Content-Type-Options'] !== 'Not set',
    'X-XSS-Protection': headers['X-XSS-Protection'] !== 'Not set',
    'Strict-Transport-Security': headers['Strict-Transport-Security'] !== 'Not set',
    'Referrer-Policy': headers['Referrer-Policy'] !== 'Not set',
  };

  const allConfigured = Object.values(checks).every((check) => check === true);

  res.json({
    success: true,
    headers,
    checks,
    allConfigured,
    recommendations: allConfigured
      ? []
      : [
          'Some security headers are not configured. Review your Helmet configuration.',
        ],
  });
}
