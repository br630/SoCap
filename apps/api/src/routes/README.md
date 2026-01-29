# API Routes Documentation

## Authentication Routes

All authentication routes are prefixed with `/auth`.

### Public Routes

#### POST `/auth/register`
Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "timezone": "America/New_York" // optional, defaults to UTC
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "firebaseUid": "firebase-uid"
  }
}
```

#### POST `/auth/login`
Login with Firebase ID token (client obtains token from Firebase Auth).

**Request Body:**
```json
{
  "token": "firebase-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileImage": "https://...",
    "timezone": "America/New_York",
    "isVerified": true
  }
}
```

#### POST `/auth/google`
Google OAuth login (client handles OAuth flow, sends Firebase token).

**Request Body:**
```json
{
  "token": "firebase-id-token-from-google-oauth"
}
```

**Response:** Same as `/auth/login`

#### POST `/auth/apple`
Apple Sign-In login (client handles OAuth flow, sends Firebase token).

**Request Body:**
```json
{
  "token": "firebase-id-token-from-apple-sign-in"
}
```

**Response:** Same as `/auth/login`

### Protected Routes (Require Authentication)

All protected routes require `Authorization: Bearer <firebase-id-token>` header.

#### GET `/auth/profile`
Get current user profile with statistics.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileImage": "https://...",
    "timezone": "America/New_York",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "stats": {
    "contacts": 10,
    "relationships": 5,
    "events": 3,
    "savingsGoals": 2,
    "pendingReminders": 5
  }
}
```

#### PUT `/auth/profile`
Update user profile.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Request Body:**
```json
{
  "firstName": "Jane", // optional
  "lastName": "Smith",  // optional
  "profileImage": "https://...", // optional, empty string to remove
  "timezone": "Europe/London" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "profileImage": "https://...",
    "timezone": "Europe/London"
  }
}
```

#### DELETE `/auth/account`
Delete user account and all associated data (GDPR compliance).

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Note:** This permanently deletes:
- User record
- All contacts (cascade)
- All relationships (cascade)
- All events (cascade)
- All savings goals (cascade)
- All reminders (cascade)
- Firebase user account

#### GET `/auth/export`
Export all user data as JSON (GDPR compliance).

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="user-data-{userId}-{timestamp}.json"`

**Response Body:** Complete JSON export including:
- User profile
- Contacts
- Relationships
- Events
- Savings goals
- Reminders
- Interactions
- Transactions

## Error Responses

All endpoints return consistent error responses:

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

**Authentication Error (401):**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header"
}
```

**Not Found (404):**
```json
{
  "error": "Not Found",
  "message": "User profile not found"
}
```

**Server Error (500):**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to process request"
}
```
