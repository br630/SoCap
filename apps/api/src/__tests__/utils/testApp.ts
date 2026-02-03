import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../../routes/authRoutes';
import contactRoutes from '../../routes/contactRoutes';
import eventRoutes from '../../routes/eventRoutes';
import dashboardRoutes from '../../routes/dashboardRoutes';
import {
  errorHandler,
  notFoundHandler,
} from '../../middleware';

// Load environment variables
dotenv.config();

/**
 * Create Express app instance for testing
 */
export function createTestApp() {
  const app = express();

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS for tests
  app.use(cors());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
