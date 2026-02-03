# Security Documentation

This document outlines the security measures implemented in the SoCap API.

## Table of Contents

1. [Security Headers](#security-headers)
2. [Rate Limiting](#rate-limiting)
3. [Input Validation](#input-validation)
4. [SQL Injection Prevention](#sql-injection-prevention)
5. [Authentication Hardening](#authentication-hardening)
6. [Audit Logging](#audit-logging)
7. [Error Handling](#error-handling)
8. [CORS Configuration](#cors-configuration)
9. [Request Logging](#request-logging)
10. [Best Practices](#best-practices)

## Security Headers

The API uses Helmet.js to set various HTTP security headers:

- **Content-Security-Policy**: Prevents XSS attacks by controlling resource loading
- **X-Frame-Options**: Prevents clickjacking attacks (set to DENY)
- **X-Content-Type-Options**: Prevents MIME type sniffing (set to nosniff)
- **X-XSS-Protection**: Enables browser XSS filter
- **Referrer-Policy**: Controls referrer information (strict-origin-when-cross-origin)
- **Strict-Transport-Security (HSTS)**: Forces HTTPS in production
- **Permissions-Policy**: Controls browser features

### Verifying Security Headers

Use the security headers check endpoint:

```bash
GET /api/security/headers
Authorization: Bearer <token>
```

## Rate Limiting

Rate limiting is implemented at multiple levels:

### IP-Based Rate Limiting
- **General endpoints**: 100 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP
- **Sensitive operations**: 5 requests per hour per IP

### User-Based Rate Limiting
- **General endpoints**: 1000 requests per hour per user
- **Authentication endpoints**: 20 requests per hour per user
- **Sensitive operations**: 10 requests per day per user

### Rate Limit Headers

Responses include rate limit information:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Reset time (ISO string)
- `Retry-After`: Seconds until retry is allowed (when exceeded)

### Redis Support

For distributed systems, Redis-based rate limiting can be enabled by setting `REDIS_URL` environment variable. Falls back to in-memory store if Redis is unavailable.

## Input Validation

All endpoints use Zod schemas for input validation:

- **UUID validation**: Ensures valid UUID format
- **Date validation**: Validates ISO datetime strings
- **Email validation**: Validates and normalizes email addresses
- **Phone validation**: Validates international phone number format
- **Enum validation**: Ensures values match allowed enums
- **String sanitization**: Removes potentially dangerous characters

### Sanitization

All string inputs are sanitized to prevent:
- HTML injection
- JavaScript injection
- Event handler injection
- Length-based attacks (max 10,000 characters)

## SQL Injection Prevention

- **Prisma ORM**: All database queries use Prisma, which uses parameterized queries
- **No raw queries**: Raw SQL queries are not used
- **Type safety**: Prisma provides compile-time type safety

## Authentication Hardening

### Account Lockout

- **Failed login attempts**: Account locked after 5 failed attempts
- **Lockout duration**: 15 minutes
- **Automatic unlock**: Account automatically unlocks after lockout period

### Password Requirements

Passwords must meet the following requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Rotation

Tokens are marked for rotation after sensitive operations:
- Password changes
- Account settings changes
- Permission changes

## Audit Logging

All sensitive operations are logged to the `audit_logs` table:

### Logged Actions

- **Authentication**: Login success/failure, logout, password changes
- **Account Management**: Account lockout, deletion, verification
- **Data Operations**: Data export, import, bulk delete
- **Financial Operations**: Transaction creation/update/deletion, savings goal changes
- **Security Events**: Permission changes, API key management, calendar connections

### Audit Log Fields

- `userId`: User who performed the action (null for unauthenticated actions)
- `action`: Type of action performed
- `ipAddress`: Client IP address
- `userAgent`: Client user agent string
- `details`: Additional action-specific details (JSON)
- `createdAt`: Timestamp of the action

### Accessing Audit Logs

Audit logs can be queried by:
- User ID
- Action type
- Date range

## Error Handling

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "User-friendly error message"
}
```

### Error Types

- **400 Bad Request**: Validation errors, invalid input
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server errors

### Security Considerations

- **No stack traces**: Stack traces are never exposed to clients in production
- **Generic messages**: Detailed error messages are only shown in development
- **Server-side logging**: All errors are logged server-side with full details

## CORS Configuration

### Development
- All origins allowed
- Credentials allowed

### Production
- Only whitelisted origins allowed (set via `ALLOWED_ORIGINS` environment variable)
- Credentials allowed
- Specific methods and headers allowed

### Environment Variable

```bash
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Request Logging

All requests are logged using Morgan with sensitive data redaction:

### Redacted Fields

- `password`
- `token`
- `accessToken`
- `refreshToken`
- `authorization`
- `apiKey`
- `secret`
- `creditCard`
- `ssn`

### Log Format

```
METHOD URL STATUS content-length - response-time ms [body] [query]
```

### Skipped Endpoints

- `/health`
- `/api/health`

## Best Practices

### For Developers

1. **Always validate input**: Use Zod schemas for all endpoints
2. **Sanitize strings**: Use `sanitizeString()` utility for user input
3. **Log sensitive operations**: Use `auditService.log()` for audit logging
4. **Handle errors properly**: Use `asyncHandler()` wrapper for async routes
5. **Never expose sensitive data**: Redact sensitive fields in logs and responses

### For Operations

1. **Monitor audit logs**: Regularly review audit logs for suspicious activity
2. **Review rate limit violations**: Monitor 429 responses
3. **Check security headers**: Use `/api/security/headers` endpoint
4. **Keep dependencies updated**: Regularly update npm packages
5. **Use HTTPS**: Always use HTTPS in production

### Environment Variables

```bash
# Security
NODE_ENV=production
ALLOWED_ORIGINS=https://app.example.com
REDIS_URL=redis://localhost:6379  # Optional, for distributed rate limiting

# Database
DATABASE_URL=postgresql://...

# Encryption
ENCRYPTION_KEY=your-32-byte-hex-key
```

## Security Checklist

- [x] Security headers configured (Helmet)
- [x] Rate limiting implemented
- [x] Input validation (Zod)
- [x] SQL injection prevention (Prisma)
- [x] Account lockout mechanism
- [x] Password complexity requirements
- [x] Audit logging
- [x] Error handling (no stack traces)
- [x] CORS configuration
- [x] Request logging with redaction
- [x] Security headers check endpoint

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com. Do not create a public GitHub issue.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Zod Documentation](https://zod.dev/)
- [Prisma Security](https://www.prisma.io/docs/guides/security)
