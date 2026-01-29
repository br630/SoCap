# Contact Management API

## Overview
Complete contact management API with relationship tracking, interaction logging, and bulk import capabilities.

## Endpoints

### GET /contacts
Get all contacts with relationship info, pagination, filtering, and sorting.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `tier` (RelationshipTier): Filter by relationship tier
- `search` (string): Search by name, email, or phone
- `sortBy` (string): Sort field - `name`, `createdAt`, `lastContactDate` (default: `createdAt`)
- `sortOrder` (string): `asc` or `desc` (default: `desc`)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "relationship": {
        "tier": "CLOSE_FRIENDS",
        "healthScore": 75,
        "lastContactDate": "2024-01-15T10:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /contacts/:id
Get a single contact with full relationship details and recent interactions.

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "relationship": {
    "tier": "CLOSE_FRIENDS",
    "healthScore": 75,
    "lastContactDate": "2024-01-15T10:00:00Z"
  },
  "recentInteractions": [
    {
      "type": "CALL",
      "date": "2024-01-15T10:00:00Z",
      "sentiment": "POSITIVE"
    }
  ]
}
```

### POST /contacts
Create a new contact and default relationship.

**Body:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "birthday": "1990-01-15T00:00:00Z",
  "anniversary": "2020-06-01T00:00:00Z",
  "notes": "Met at conference",
  "importSource": "MANUAL"
}
```

### PUT /contacts/:id
Update a contact.

**Body:** (all fields optional)
```json
{
  "name": "John Doe Updated",
  "phone": "+1234567890",
  "email": "newemail@example.com"
}
```

### DELETE /contacts/:id
Soft delete a contact.

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

### POST /contacts/import
Bulk import contacts from phone or other sources.

**Body:**
```json
{
  "contacts": [
    {
      "name": "Contact 1",
      "phone": "+1234567890",
      "email": "contact1@example.com",
      "importSource": "PHONE"
    },
    {
      "name": "Contact 2",
      "phone": "+0987654321",
      "importSource": "PHONE"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "created": 2,
    "skipped": 0,
    "duplicates": 0,
    "contacts": [...]
  }
}
```

### PUT /contacts/:id/relationship
Update relationship settings for a contact.

**Body:**
```json
{
  "tier": "CLOSE_FRIENDS",
  "customLabel": "Best Friend",
  "relationshipType": "FRIEND",
  "communicationFrequency": "WEEKLY",
  "sharedInterests": ["Gaming", "Movies"],
  "importantDates": [
    {
      "type": "BIRTHDAY",
      "date": "1990-01-15"
    }
  ]
}
```

### POST /contacts/:id/interactions
Log an interaction with a contact.

**Body:**
```json
{
  "type": "CALL",
  "date": "2024-01-15T10:00:00Z",
  "duration": 30,
  "notes": "Discussed project",
  "sentiment": "POSITIVE"
}
```

**Note:** This automatically:
- Updates `lastContactDate` on the relationship
- Recalculates the health score

### GET /contacts/:id/interactions
Get interaction history for a contact.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "CALL",
      "date": "2024-01-15T10:00:00Z",
      "duration": 30,
      "sentiment": "POSITIVE"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

## Authentication
All endpoints require authentication via `authMiddleware`. Include the Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

## Validation
All inputs are validated using Zod schemas. Invalid inputs return a 400 status with validation errors.

## Error Handling
- `400`: Validation error
- `401`: Unauthorized (missing/invalid token)
- `404`: Resource not found
- `500`: Server error
