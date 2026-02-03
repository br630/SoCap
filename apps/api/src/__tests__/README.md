# Testing Guide

This directory contains comprehensive tests for the SoCap API backend.

## Test Structure

```
__tests__/
├── setup.ts                 # Global test setup and configuration
├── unit/                    # Unit tests for services and utilities
│   ├── services/
│   │   ├── userService.test.ts
│   │   ├── contactService.test.ts
│   │   └── healthScore.test.ts
│   └── utils/
│       └── encryption.test.ts
├── integration/             # Integration tests for API endpoints
│   ├── auth.test.ts
│   ├── contacts.test.ts
│   └── events.test.ts
└── utils/                   # Test utilities and helpers
    ├── testHelpers.ts       # Factory functions and mocks
    └── testApp.ts           # Express app instance for testing
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Database Setup

Tests use a separate test database. Configure it using the `TEST_DATABASE_URL` environment variable:

```bash
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/socap_test npm test
```

If not set, tests will use the default `DATABASE_URL` or fall back to a local test database.

**Important**: The test database will be cleaned between test suites. Never use your production database for tests.

## Test Utilities

### TestFactory
Factory functions for creating test data:

```typescript
import { TestFactory } from '../utils/testHelpers';

const user = await TestFactory.createUser();
const contact = await TestFactory.createContact(userId);
const event = await TestFactory.createEvent(userId);
```

### TestCleanup
Database cleanup utilities:

```typescript
import { TestCleanup } from '../utils/testHelpers';

// Clean all test data
await TestCleanup.cleanAll();

// Clean specific user and related data
await TestCleanup.cleanUser(userId);
```

### MockHelpers
Mock utilities for external services:

```typescript
import { MockHelpers } from '../utils/testHelpers';

// Mock Firebase Admin
const mockFirebase = MockHelpers.mockFirebaseAdmin();

// Mock OpenAI
const mockOpenAI = MockHelpers.mockOpenAI();

// Mock Google Calendar
const mockCalendar = MockHelpers.mockGoogleCalendar();
```

## Writing Tests

### Unit Tests
Test individual services and utilities in isolation:

```typescript
import { UserService } from '../../../services/userService';
import { TestFactory, TestCleanup } from '../../utils/testHelpers';

describe('UserService', () => {
  beforeEach(async () => {
    await TestCleanup.cleanAll();
  });

  it('should create a user', async () => {
    const user = await UserService.createUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });
    
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

### Integration Tests
Test API endpoints end-to-end:

```typescript
import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import { TestFactory, TestCleanup } from '../utils/testHelpers';

describe('Contacts API', () => {
  const app = createTestApp();
  let testUser: any;

  beforeEach(async () => {
    await TestCleanup.cleanAll();
    testUser = await TestFactory.createUser();
  });

  it('should create a contact', async () => {
    const response = await request(app)
      .post('/api/contacts')
      .set('Authorization', 'Bearer token')
      .send({
        name: 'John Doe',
        importSource: 'MANUAL',
      });

    expect(response.status).toBe(201);
    expect(response.body.contact).toBeDefined();
  });
});
```

## Coverage Goals

Target coverage: **70%+**

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Best Practices

1. **Clean up test data**: Always clean up test data in `afterEach` or `afterAll` hooks
2. **Use factories**: Use `TestFactory` to create test data instead of manual creation
3. **Mock external services**: Mock Firebase, OpenAI, and other external services
4. **Test edge cases**: Include tests for error cases, edge cases, and boundary conditions
5. **Keep tests isolated**: Each test should be independent and not rely on other tests
6. **Use descriptive names**: Test names should clearly describe what is being tested

## Troubleshooting

### Database Connection Issues
- Ensure `TEST_DATABASE_URL` is set correctly
- Verify the test database exists and is accessible
- Check Prisma migrations are up to date

### Mock Issues
- Ensure mocks are set up in `beforeEach` hooks
- Reset mocks between tests if needed
- Check that mocked functions match the actual implementation

### Test Timeouts
- Increase timeout for slow tests: `jest.setTimeout(10000)`
- Check for hanging database connections
- Verify cleanup is happening properly
