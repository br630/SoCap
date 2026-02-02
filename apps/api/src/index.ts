import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';
import eventRoutes from './routes/eventRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reminderRoutes from './routes/reminderRoutes';
import aiRoutes from './routes/aiRoutes';
import { rateLimitMiddleware } from './middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true, // Allow credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan('dev')); // Logging

// Apply rate limiting globally
app.use(rateLimitMiddleware());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
// Listen on 0.0.0.0 to accept connections from network (for mobile devices)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://192.168.1.77:${PORT} (or your computer's IP)`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📇 Contact endpoints: http://localhost:${PORT}/api/contacts`);
  console.log(`📅 Event endpoints: http://localhost:${PORT}/api/events`);
  console.log(`🔔 Notification endpoints: http://localhost:${PORT}/api/notifications`);
  console.log(`⏰ Reminder endpoints: http://localhost:${PORT}/api/reminders`);
  console.log(`🤖 AI endpoints: http://localhost:${PORT}/api/ai`);
});

// Start reminder cron jobs (only in production or if enabled)
if (process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production') {
  import('./jobs/reminderCron').then(({ startReminderCronJobs }) => {
    startReminderCronJobs();
  });
}