import morgan from 'morgan';
import { Request, Response } from 'express';

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'apiKey',
  'secret',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
];

/**
 * Redact sensitive fields from object
 */
function redactSensitiveFields(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveFields);
  }

  const redacted = { ...obj };

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive field name
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveFields(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Custom token for logging request body (redacted)
 */
morgan.token('body-redacted', (req: Request) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const redacted = redactSensitiveFields(req.body);
    return JSON.stringify(redacted);
  }
  return '-';
});

/**
 * Custom token for logging query params (redacted)
 */
morgan.token('query-redacted', (req: Request) => {
  if (req.query && Object.keys(req.query).length > 0) {
    const redacted = redactSensitiveFields(req.query);
    return JSON.stringify(redacted);
  }
  return '-';
});

/**
 * Custom token for logging headers (redacted)
 */
morgan.token('headers-redacted', (req: Request) => {
  const headers = { ...req.headers };
  // Redact authorization header
  if (headers.authorization) {
    headers.authorization = '[REDACTED]';
  }
  return JSON.stringify(headers);
});

/**
 * Request logging middleware with sensitive data redaction
 */
export const requestLogger = morgan(
  (tokens, req: Request, res: Response) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'),
      '-',
      tokens['response-time'](req, res),
      'ms',
      tokens['body-redacted'](req, res),
      tokens['query-redacted'](req, res),
    ].join(' ');
  },
  {
    skip: (req: Request) => {
      // Skip logging health check endpoints
      return req.url === '/health' || req.url === '/api/health';
    },
  }
);
