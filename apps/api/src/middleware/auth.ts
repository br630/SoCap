import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../config/firebase';
import { FirebaseTokenError } from '../errors/firebaseErrors';
import { AuthenticatedRequest } from '../types/express';

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware - verifies Firebase ID token from Authorization header
 * 
 * Requires: Authorization: Bearer <token>
 * 
 * On success: Attaches user info to req.user
 * On failure: Returns 401 Unauthorized
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  verifyIdToken(token)
    .then((decodedToken) => {
      // Attach user info to request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken,
      };

      next();
    })
    .catch((error) => {
      if (error instanceof FirebaseTokenError) {
        // Handle expired tokens with appropriate status code
        if (error.code === 'auth/id-token-expired') {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Token has expired. Please refresh your authentication token.',
            code: 'TOKEN_EXPIRED',
          });
          return;
        }

        // Handle revoked tokens
        if (error.code === 'auth/id-token-revoked') {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Token has been revoked. Please re-authenticate.',
            code: 'TOKEN_REVOKED',
          });
          return;
        }

        // Handle invalid tokens
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message || 'Invalid authentication token',
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Handle unexpected errors
      console.error('Unexpected error in auth middleware:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while verifying authentication token',
      });
    });
}

/**
 * Optional authentication middleware - same as authMiddleware but doesn't fail if no token
 * 
 * If token is present and valid: Attaches user info to req.user
 * If token is missing or invalid: Continues without req.user (doesn't fail)
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    // No token provided - continue without authentication
    next();
    return;
  }

  verifyIdToken(token)
    .then((decodedToken) => {
      // Attach user info to request object if token is valid
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        token: decodedToken,
      };

      next();
    })
    .catch((error) => {
      // Token is invalid but we don't fail - just continue without req.user
      // Log the error for debugging but don't block the request
      if (process.env.NODE_ENV === 'development') {
        console.warn('Optional auth middleware: Invalid token provided:', error.message);
      }

      // Continue without authentication
      next();
    });
}
