# Middleware Documentation

## Authentication Middleware

### `authMiddleware`

Requires a valid Firebase ID token in the Authorization header. Attaches user information to `req.user`.

**Usage:**
```typescript
import express from 'express';
import { authMiddleware } from './middleware/auth';

const router = express.Router();

// Protected route - requires authentication
router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  // req.user is guaranteed to exist here
  const userId = req.user!.uid;
  const email = req.user!.email;
  
  // Your route handler
  res.json({ userId, email });
});
```

**Headers Required:**
```
Authorization: Bearer <firebase-id-token>
```

**Response on Failure:**
- `401 Unauthorized` - Missing or invalid token
- `401 Unauthorized` with `TOKEN_EXPIRED` code - Token has expired
- `401 Unauthorized` with `TOKEN_REVOKED` code - Token has been revoked

### `optionalAuthMiddleware`

Same as `authMiddleware` but doesn't fail if no token is provided. Useful for routes that work with or without authentication.

**Usage:**
```typescript
import express from 'express';
import { optionalAuthMiddleware } from './middleware/auth';

const router = express.Router();

// Optional authentication - works with or without token
router.get('/public-content', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  if (req.user) {
    // User is authenticated - show personalized content
    res.json({ content: 'Personalized content', userId: req.user.uid });
  } else {
    // User is not authenticated - show public content
    res.json({ content: 'Public content' });
  }
});
```

## Rate Limiting Middleware

### `rateLimitMiddleware`

Limits requests per IP address and per authenticated user. Uses in-memory storage.

**Default Limits:**
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

**Usage:**
```typescript
import express from 'express';
import { rateLimitMiddleware } from './middleware/rateLimit';

const app = express();

// Apply rate limiting globally
app.use(rateLimitMiddleware());

// Or with custom configuration
app.use(rateLimitMiddleware({
  ipLimit: 50,        // 50 requests per IP
  ipWindowMs: 60000,  // per minute
  userLimit: 500,     // 500 requests per user
  userWindowMs: 3600000, // per hour
  message: 'Custom rate limit message'
}));
```

**Response Headers:**
- `X-RateLimit-Limit` - User limit
- `X-RateLimit-Remaining` - Remaining requests for user
- `X-RateLimit-Reset` - Reset time for user (ISO string)
- `X-RateLimit-Limit-IP` - IP limit
- `X-RateLimit-Remaining-IP` - Remaining requests for IP
- `X-RateLimit-Reset-IP` - Reset time for IP (ISO string)
- `Retry-After` - Seconds until rate limit resets (when exceeded)

**Response on Rate Limit Exceeded:**
```json
{
  "error": "Too Many Requests",
  "message": "Too many requests, please try again later",
  "retryAfter": 45,
  "limit": 100,
  "window": 60000
}
```

## Combined Usage Example

```typescript
import express from 'express';
import { authMiddleware, optionalAuthMiddleware, rateLimitMiddleware } from './middleware';
import { AuthenticatedRequest } from '../types/express';

const app = express();

// Apply rate limiting globally
app.use(rateLimitMiddleware());

// Public routes
app.get('/public', optionalAuthMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ message: 'Public endpoint' });
});

// Protected routes
app.get('/protected', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ 
    message: 'Protected endpoint',
    userId: req.user!.uid 
  });
});

// Routes with custom rate limiting
app.post('/api/upload', 
  rateLimitMiddleware({ ipLimit: 10, ipWindowMs: 60000 }), // 10 per minute
  authMiddleware,
  (req: AuthenticatedRequest, res) => {
    // Upload handler
  }
);
```

## TypeScript Types

The `AuthenticatedRequest` type extends Express `Request` with optional user information:

```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    token: admin.auth.DecodedIdToken;
  };
}
```

Use this type for route handlers that use authentication middleware:

```typescript
import { AuthenticatedRequest } from '../types/express';

router.get('/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
  // TypeScript knows req.user exists after authMiddleware
  const userId = req.user!.uid;
});
```
