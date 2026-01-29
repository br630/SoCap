import { Request, Response, NextFunction } from 'express';
import { encryptObject, decryptObject } from '../utils/encryption';

/**
 * Configuration for which fields to encrypt/decrypt per model
 */
const ENCRYPTION_CONFIG: Record<string, string[]> = {
  Contact: ['phone', 'email', 'notes'],
  // Add other models as needed
  // User: ['phone'],
  // Event: ['notes'],
};

/**
 * Middleware to encrypt sensitive fields before saving to database
 * Attach to routes that create/update data
 */
export function encryptSensitiveFields(modelName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const fieldsToEncrypt = ENCRYPTION_CONFIG[modelName];
      
      if (!fieldsToEncrypt || fieldsToEncrypt.length === 0) {
        return next();
      }

      // Encrypt body fields
      if (req.body && typeof req.body === 'object') {
        req.body = encryptObject(req.body, fieldsToEncrypt);
      }

      // Encrypt array of objects (for bulk operations)
      if (Array.isArray(req.body)) {
        req.body = req.body.map((item) => 
          typeof item === 'object' ? encryptObject(item, fieldsToEncrypt) : item
        );
      }

      // Encrypt nested objects (e.g., req.body.contacts[])
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          if (Array.isArray(req.body[key])) {
            req.body[key] = req.body[key].map((item: any) =>
              typeof item === 'object' ? encryptObject(item, fieldsToEncrypt) : item
            );
          }
        }
      }

      next();
    } catch (error) {
      console.error('Encryption middleware error:', error);
      // Continue without encryption if it fails (log error but don't block request)
      next();
    }
  };
}

/**
 * Middleware to decrypt sensitive fields when reading from database
 * Attach to routes that return data
 */
export function decryptSensitiveFields(modelName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const fieldsToDecrypt = ENCRYPTION_CONFIG[modelName];
      
      if (!fieldsToDecrypt || fieldsToDecrypt.length === 0) {
        return next();
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to decrypt before sending
      res.json = function (data: any) {
        if (data && typeof data === 'object') {
          // Handle paginated responses
          if (data.data && Array.isArray(data.data)) {
            data.data = data.data.map((item: any) =>
              typeof item === 'object' ? decryptObject(item, fieldsToDecrypt) : item
            );
          }
          // Handle single object
          else if (!Array.isArray(data)) {
            data = decryptObject(data, fieldsToDecrypt);
          }
          // Handle array of objects
          else {
            data = data.map((item: any) =>
              typeof item === 'object' ? decryptObject(item, fieldsToDecrypt) : item
            );
          }
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Decryption middleware error:', error);
      // Continue without decryption if it fails
      next();
    }
  };
}

/**
 * Helper function to encrypt fields in service layer
 */
export function encryptContactFields<T extends Record<string, any>>(data: T): T {
  return encryptObject(data, ENCRYPTION_CONFIG.Contact);
}

/**
 * Helper function to decrypt fields in service layer
 */
export function decryptContactFields<T extends Record<string, any>>(data: T): T {
  return decryptObject(data, ENCRYPTION_CONFIG.Contact);
}
