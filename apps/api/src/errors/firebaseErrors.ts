/**
 * Base error class for Firebase-related errors
 */
export class FirebaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FirebaseError';
    Object.setPrototypeOf(this, FirebaseError.prototype);
  }
}

/**
 * Error thrown when Firebase ID token verification fails
 */
export class FirebaseTokenError extends FirebaseError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'FirebaseTokenError';
    Object.setPrototypeOf(this, FirebaseTokenError.prototype);
  }
}

/**
 * Error thrown when a Firebase user is not found
 */
export class FirebaseUserNotFoundError extends FirebaseError {
  constructor(message: string = 'Firebase user not found') {
    super(message);
    this.name = 'FirebaseUserNotFoundError';
    Object.setPrototypeOf(this, FirebaseUserNotFoundError.prototype);
  }
}

/**
 * Error thrown when Firebase user creation fails
 */
export class FirebaseUserCreationError extends FirebaseError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'FirebaseUserCreationError';
    Object.setPrototypeOf(this, FirebaseUserCreationError.prototype);
  }
}

/**
 * Error thrown when Firebase user deletion fails
 */
export class FirebaseUserDeletionError extends FirebaseError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = 'FirebaseUserDeletionError';
    Object.setPrototypeOf(this, FirebaseUserDeletionError.prototype);
  }
}

/**
 * Error thrown when Firebase configuration is invalid
 */
export class FirebaseConfigError extends FirebaseError {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseConfigError';
    Object.setPrototypeOf(this, FirebaseConfigError.prototype);
  }
}
