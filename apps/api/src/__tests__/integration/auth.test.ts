import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import { TestFactory, TestCleanup, MockHelpers } from '../utils/testHelpers';
import { UserService } from '../../services/userService';
import * as firebase from '../../config/firebase';

// Mock Firebase
jest.mock('../../config/firebase');
const mockFirebase = firebase as jest.Mocked<typeof firebase>;

describe('Auth API Integration Tests', () => {
  const app = createTestApp();
  let testUser: any;

  beforeEach(async () => {
    await TestCleanup.cleanAll();
    
    // Setup Firebase mocks
    mockFirebase.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-123',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
    } as any);
  });

  afterEach(async () => {
    if (testUser) {
      await TestCleanup.cleanUser(testUser.id);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          token: 'valid-firebase-token',
          firstName: 'John',
          lastName: 'Doe',
          timezone: 'America/New_York',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.firstName).toBe('John');
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 if Firebase token is invalid', async () => {
      mockFirebase.verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          token: 'invalid-token',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication failed');
    });

    it('should return 409 if user already exists', async () => {
      // Create existing user
      testUser = await UserService.createUser({
        email: 'test@example.com',
        firstName: 'Existing',
        lastName: 'User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          token: 'valid-firebase-token',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Registration failed');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      testUser = await TestFactory.createUser({
        email: 'login@example.com',
      });
    });

    it('should login with valid Firebase token', async () => {
      mockFirebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-456',
        email: 'login@example.com',
        email_verified: true,
      } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          token: 'valid-firebase-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('should return 401 with invalid token', async () => {
      mockFirebase.verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          token: 'invalid-token',
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 if user does not exist', async () => {
      mockFirebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-789',
        email: 'nonexistent@example.com',
        email_verified: true,
      } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          token: 'valid-firebase-token',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      testUser = await TestFactory.createUser();
    });

    it('should return user profile with valid token', async () => {
      mockFirebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid',
        email: testUser.email,
        email_verified: true,
      } as any);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testUser.id);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      testUser = await TestFactory.createUser();
    });

    it('should update user profile', async () => {
      mockFirebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid',
        email: testUser.email,
        email_verified: true,
      } as any);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          timezone: 'America/Los_Angeles',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.firstName).toBe('Updated');
      expect(response.body.user.lastName).toBe('Name');
    });

    it('should validate input data', async () => {
      mockFirebase.verifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid',
        email: testUser.email,
        email_verified: true,
      } as any);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'invalid-email', // Invalid email format
        });

      expect(response.status).toBe(400);
    });
  });
});
