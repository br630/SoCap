import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import contactRoutes from './routes/contactRoutes';
import eventRoutes from './routes/eventRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reminderRoutes from './routes/reminderRoutes';
import aiRoutes from './routes/aiRoutes';
import calendarRoutes from './routes/calendarRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import securityRoutes from './routes/securityRoutes';
import {
  securityMiddleware,
  additionalSecurityHeaders,
  apiRateLimiter,
  authRateLimiter,
  errorHandler,
  notFoundHandler,
  requestLogger,
} from './middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Security middleware (must be first)
app.use(securityMiddleware());
app.use(additionalSecurityHeaders);

// CORS configuration
const allowedOrigins = isDevelopment
  ? true // Allow all origins in development
  : (process.env.ALLOWED_ORIGINS?.split(',') || []);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-RateLimit-Limit-IP',
      'X-RateLimit-Remaining-IP',
      'X-RateLimit-Reset-IP',
    ],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with sensitive data redaction
app.use(requestLogger);

// Apply rate limiting globally
app.use(apiRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
// Auth routes with stricter rate limiting
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/security', securityRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

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
    console.log(`📆 Calendar endpoints: http://localhost:${PORT}/api/calendar`);
    console.log(`📊 Dashboard endpoints: http://localhost:${PORT}/api/dashboard`);
});

// Start reminder cron jobs (only in production or if enabled)
if (process.env.ENABLE_CRON_JOBS === 'true' || process.env.NODE_ENV === 'production') {
  import('./jobs/reminderCron').then(({ startReminderCronJobs }) => {
    startReminderCronJobs();
  });
}