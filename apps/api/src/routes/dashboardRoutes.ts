import { Router } from 'express';
import { authMiddleware } from '../middleware';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

/**
 * Dashboard Routes
 * All routes require authentication
 */

// GET /dashboard - Get dashboard data
router.get('/', authMiddleware, dashboardController.getDashboard);

// GET /dashboard/insights - Get detailed insights
router.get('/insights', authMiddleware, dashboardController.getInsights);

// GET /dashboard/health-score/history - Get health score history
router.get('/health-score/history', authMiddleware, dashboardController.getHealthScoreHistory);

export default router;
