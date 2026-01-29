import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import {
  FirebaseError,
  FirebaseTokenError,
  FirebaseUserNotFoundError,
  FirebaseUserCreationError,
  FirebaseUserDeletionError,
  FirebaseConfigError,
} from '../errors/firebaseErrors';

// Ensure environment variables are loaded before initialization
dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * Supports both service account JSON and individual environment variables
 */
function initializeFirebaseAdmin(): admin.app.App {
  // Check if Firebase Admin is already initialized
  if (admin.apps.length > 0) {
    // Non-null assertion is safe here because length > 0
    return admin.apps[0]!;
  }

  try {
    // Option 1: Service account JSON from environment variable
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      try {
        // Some environments (or manual edits) wrap the JSON in quotes.
        // Try to handle both raw JSON and quoted JSON gracefully.
        let jsonString = serviceAccountJson.trim();

        // Strip leading/trailing single quotes if present
        if ((jsonString.startsWith("'") && jsonString.endsWith("'")) ||
            (jsonString.startsWith('"') && jsonString.endsWith('"'))) {
          jsonString = jsonString.slice(1, -1);
        }

        // Unescape any escaped quotes
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\'/g, "'");

        const serviceAccount = JSON.parse(jsonString);
        
        // Validate required fields
        if (!serviceAccount.project_id && !serviceAccount.projectId) {
          throw new Error('Missing required field: project_id or projectId');
        }
        if (!serviceAccount.private_key && !serviceAccount.privateKey) {
          throw new Error('Missing required field: private_key or privateKey');
        }
        if (!serviceAccount.client_email && !serviceAccount.clientEmail) {
          throw new Error('Missing required field: client_email or clientEmail');
        }

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (parseError: any) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        const preview = serviceAccountJson.length > 100 
          ? `${serviceAccountJson.substring(0, 50)}...${serviceAccountJson.substring(serviceAccountJson.length - 50)}`
          : serviceAccountJson;
        
        throw new FirebaseConfigError(
          `Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${errorMessage}\n` +
          `Preview: ${preview}\n` +
          `Please ensure FIREBASE_SERVICE_ACCOUNT is a valid JSON string without extra quotes.`
        );
      }
    }

    // Option 2: Individual service account fields from environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Replace escaped newlines in private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    }

    // Option 3: Use default credentials (for Google Cloud environments)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCLOUD_PROJECT) {
      return admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    throw new FirebaseConfigError(
      'Firebase Admin SDK initialization failed. Please provide one of the following:\n' +
        '1. FIREBASE_SERVICE_ACCOUNT (JSON string)\n' +
        '2. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY\n' +
        '3. GOOGLE_APPLICATION_CREDENTIALS or GCLOUD_PROJECT for default credentials'
    );
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      throw error;
    }
    throw new FirebaseConfigError(
      `Failed to initialize Firebase Admin SDK: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Lazy initialization - only initialize when first accessed
let firebaseAdminInstance: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseAdminInstance) {
    firebaseAdminInstance = initializeFirebaseAdmin();
  }
  return firebaseAdminInstance;
}

// Export for backward compatibility (lazy getter)
export const firebaseAdmin = {
  auth: () => getFirebaseAdmin().auth(),
} as admin.app.App;

/**
 * Verify Firebase ID token and return decoded token
 * @param token - Firebase ID token string
 * @returns Decoded token with user information
 * @throws FirebaseTokenError if token verification fails
 */
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  try {
    if (!token) {
      throw new FirebaseTokenError('ID token is required', 'MISSING_TOKEN');
    }

    const decodedToken = await getFirebaseAdmin().auth().verifyIdToken(token);
    return decodedToken;
  } catch (error: any) {
    if (error instanceof FirebaseTokenError) {
      throw error;
    }

    // Handle Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        case 'auth/argument-error':
          throw new FirebaseTokenError('Invalid ID token format', error.code);
        case 'auth/id-token-expired':
          throw new FirebaseTokenError('ID token has expired', error.code);
        case 'auth/id-token-revoked':
          throw new FirebaseTokenError('ID token has been revoked', error.code);
        case 'auth/invalid-id-token':
          throw new FirebaseTokenError('Invalid ID token', error.code);
        default:
          throw new FirebaseTokenError(
            `Token verification failed: ${error.message || 'Unknown error'}`,
            error.code
          );
      }
    }

    throw new FirebaseTokenError(
      `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Firebase user by email
 * @param email - User email address
 * @returns Firebase user record
 * @throws FirebaseUserNotFoundError if user is not found
 * @throws FirebaseError for other errors
 */
export async function getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
  try {
    if (!email) {
      throw new FirebaseError('Email is required');
    }

    const user = await getFirebaseAdmin().auth().getUserByEmail(email);
    return user;
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      throw error;
    }

    // Handle Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new FirebaseUserNotFoundError(`User with email ${email} not found`);
    }

    if (error.code === 'auth/invalid-email') {
      throw new FirebaseError(`Invalid email format: ${email}`, error.code);
    }

    throw new FirebaseError(
      `Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error.code
    );
  }
}

/**
 * Get Firebase user by UID
 * @param uid - User UID
 * @returns Firebase user record
 * @throws FirebaseUserNotFoundError if user is not found
 * @throws FirebaseError for other errors
 */
export async function getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
  try {
    if (!uid) {
      throw new FirebaseError('UID is required');
    }

    const user = await getFirebaseAdmin().auth().getUser(uid);
    return user;
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      throw error;
    }

    if (error.code === 'auth/user-not-found') {
      throw new FirebaseUserNotFoundError(`User with UID ${uid} not found`);
    }

    throw new FirebaseError(
      `Failed to get user by UID: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error.code
    );
  }
}

/**
 * Create a new Firebase user
 * @param email - User email address
 * @param password - User password (optional, can be set later)
 * @param additionalData - Additional user properties (displayName, photoURL, etc.)
 * @returns Created Firebase user record
 * @throws FirebaseUserCreationError if user creation fails
 */
export async function createUser(
  email: string,
  password?: string,
  additionalData?: {
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
    emailVerified?: boolean;
    phoneNumber?: string;
  }
): Promise<admin.auth.UserRecord> {
  try {
    if (!email) {
      throw new FirebaseUserCreationError('Email is required', 'MISSING_EMAIL');
    }

    const createUserData: admin.auth.CreateRequest = {
      email,
      ...(password && { password }),
      ...(additionalData?.displayName && { displayName: additionalData.displayName }),
      ...(additionalData?.photoURL && { photoURL: additionalData.photoURL }),
      ...(additionalData?.disabled !== undefined && { disabled: additionalData.disabled }),
      ...(additionalData?.emailVerified !== undefined && { emailVerified: additionalData.emailVerified }),
      ...(additionalData?.phoneNumber && { phoneNumber: additionalData.phoneNumber }),
    };

    const user = await getFirebaseAdmin().auth().createUser(createUserData);
    return user;
  } catch (error: any) {
    if (error instanceof FirebaseUserCreationError) {
      throw error;
    }

    // Handle Firebase Auth errors
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-exists':
          throw new FirebaseUserCreationError(
            `User with email ${email} already exists`,
            error.code
          );
        case 'auth/invalid-email':
          throw new FirebaseUserCreationError(`Invalid email format: ${email}`, error.code);
        case 'auth/invalid-password':
          throw new FirebaseUserCreationError('Password must be at least 6 characters', error.code);
        case 'auth/phone-number-already-exists':
          throw new FirebaseUserCreationError('Phone number already exists', error.code);
        default:
          throw new FirebaseUserCreationError(
            `User creation failed: ${error.message || 'Unknown error'}`,
            error.code
          );
      }
    }

    throw new FirebaseUserCreationError(
      `User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a Firebase user by UID
 * @param uid - User UID
 * @throws FirebaseUserDeletionError if user deletion fails
 */
export async function deleteUser(uid: string): Promise<void> {
  try {
    if (!uid) {
      throw new FirebaseUserDeletionError('UID is required', 'MISSING_UID');
    }

    await getFirebaseAdmin().auth().deleteUser(uid);
  } catch (error: any) {
    if (error instanceof FirebaseUserDeletionError) {
      throw error;
    }

    // Handle Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new FirebaseUserNotFoundError(`User with UID ${uid} not found`);
    }

    throw new FirebaseUserDeletionError(
      `User deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error.code
    );
  }
}

/**
 * Update a Firebase user
 * @param uid - User UID
 * @param updateData - User properties to update
 * @returns Updated Firebase user record
 * @throws FirebaseError if update fails
 */
export async function updateUser(
  uid: string,
  updateData: admin.auth.UpdateRequest
): Promise<admin.auth.UserRecord> {
  try {
    if (!uid) {
      throw new FirebaseError('UID is required');
    }

    const user = await getFirebaseAdmin().auth().updateUser(uid, updateData);
    return user;
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      throw error;
    }

    if (error.code === 'auth/user-not-found') {
      throw new FirebaseUserNotFoundError(`User with UID ${uid} not found`);
    }

    throw new FirebaseError(
      `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error.code
    );
  }
}

/**
 * Set custom claims for a user
 * @param uid - User UID
 * @param customClaims - Custom claims object
 * @throws FirebaseError if setting claims fails
 */
export async function setCustomClaims(uid: string, customClaims: Record<string, any>): Promise<void> {
  try {
    if (!uid) {
      throw new FirebaseError('UID is required');
    }

    await getFirebaseAdmin().auth().setCustomUserClaims(uid, customClaims);
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      throw error;
    }

    if (error.code === 'auth/user-not-found') {
      throw new FirebaseUserNotFoundError(`User with UID ${uid} not found`);
    }

    throw new FirebaseError(
      `Failed to set custom claims: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error.code
    );
  }
}

/**
 * List users with pagination
 * @param maxResults - Maximum number of users to return (default: 1000, max: 1000)
 * @param pageToken - Token for pagination
 * @returns List of users and next page token
 * @throws FirebaseError if listing fails
 */
export async function listUsers(
  maxResults: number = 1000,
  pageToken?: string
): Promise<admin.auth.ListUsersResult> {
  try {
    const listUsersResult = await getFirebaseAdmin().auth().listUsers(maxResults, pageToken);
    return listUsersResult;
  } catch (error: any) {
    throw new FirebaseError(
      `Failed to list users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error.code
    );
  }
}
