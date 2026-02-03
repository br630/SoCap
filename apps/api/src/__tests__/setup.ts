import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/socap_test';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-for-testing-only-do-not-use-in-production';

// Use the same Prisma client instance as the app
// In tests, we'll use transactions or cleanup utilities
import { prisma } from '../../lib/prisma';

// Global test setup
beforeAll(async () => {
  // Ensure Prisma client is ready
  await prisma.$connect();
});

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Export test utilities
export { prisma };
