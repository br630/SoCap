import { Request } from 'express';
import * as admin from 'firebase-admin';

/**
 * Extended Express Request with authenticated user information
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Firebase user UID
   */
  user?: {
    /**
     * Firebase user UID
     */
    uid: string;
    /**
     * Firebase user email
     */
    email?: string;
    /**
     * Decoded Firebase ID token
     */
    token: admin.auth.DecodedIdToken;
  };
}
