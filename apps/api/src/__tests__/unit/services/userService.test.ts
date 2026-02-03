import { UserService } from '../../../services/userService';
import { TestFactory, TestCleanup } from '../../utils/testHelpers';
import { prisma } from '../../setup';

describe('UserService', () => {
  let testUser: any;

  beforeEach(async () => {
    await TestCleanup.cleanAll();
  });

  afterEach(async () => {
    if (testUser) {
      await TestCleanup.cleanUser(testUser.id);
    }
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashedpassword',
      };

      testUser = await UserService.createUser(userData);

      expect(testUser).toBeDefined();
      expect(testUser.email).toBe(userData.email);
      expect(testUser.firstName).toBe(userData.firstName);
      expect(testUser.lastName).toBe(userData.lastName);
      expect(testUser.isActive).toBe(true);
      expect(testUser.isVerified).toBe(false);
      expect(testUser.timezone).toBe('UTC');
    });

    it('should throw error when email already exists', async () => {
      testUser = await TestFactory.createUser({
        email: 'duplicate@example.com',
      });

      await expect(
        UserService.createUser({
          email: 'duplicate@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should set default notification preferences', async () => {
      testUser = await UserService.createUser({
        email: 'prefs@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(testUser.notificationPreferences).toEqual({
        email: true,
        push: true,
        sms: false,
      });
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      testUser = await TestFactory.createUser();

      const retrievedUser = await UserService.getUserById(testUser.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(testUser.id);
      expect(retrievedUser?.email).toBe(testUser.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await UserService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve user by email', async () => {
      testUser = await TestFactory.createUser({
        email: 'findme@example.com',
      });

      const retrievedUser = await UserService.getUserByEmail('findme@example.com');

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(testUser.id);
      expect(retrievedUser?.email).toBe('findme@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await UserService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      testUser = await TestFactory.createUser();

      const updatedUser = await UserService.updateUser(testUser.id, {
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.email).toBe(testUser.email);
    });

    it('should throw error when user not found', async () => {
      await expect(
        UserService.updateUser('non-existent-id', {
          firstName: 'Updated',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user (set isActive to false)', async () => {
      testUser = await TestFactory.createUser();

      const deletedUser = await UserService.deleteUser(testUser.id);

      expect(deletedUser.isActive).toBe(false);
      
      // Verify user still exists in database
      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user).toBeDefined();
      expect(user?.isActive).toBe(false);
    });

    it('should throw error when user not found', async () => {
      await expect(UserService.deleteUser('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      testUser = await TestFactory.createUser();

      const newPreferences = {
        email: false,
        push: true,
        sms: true,
      };

      const updatedUser = await UserService.updateNotificationPreferences(
        testUser.id,
        newPreferences
      );

      expect(updatedUser.notificationPreferences).toEqual(newPreferences);
    });

    it('should throw error when user not found', async () => {
      await expect(
        UserService.updateNotificationPreferences('non-existent-id', {
          email: true,
        })
      ).rejects.toThrow('User not found');
    });
  });
});
