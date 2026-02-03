import { Response } from 'express';
import { dashboardService } from '../services/dashboardService';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../types/express';

/**
 * Helper to get local user ID from Firebase UID
 */
async function getLocalUserId(firebaseUid: string, email?: string): Promise<string> {
  const localUser = await UserService.getUserByEmail(email || '');
  if (!localUser) {
    throw new Error('User not found in local database');
  }
  return localUser.id;
}

/**
 * Get dashboard data
 * GET /dashboard
 */
export async function getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const dashboardData = await dashboardService.getDashboard(localUserId);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
    });
  }
}

/**
 * Get insights data
 * GET /dashboard/insights
 */
export async function getInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const insightsData = await dashboardService.getInsights(localUserId);

    res.json({
      success: true,
      data: insightsData,
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch insights',
    });
  }
}

/**
 * Get health score history
 * GET /dashboard/health-score/history
 * Query: days (optional, default 30)
 */
export async function getHealthScoreHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const localUserId = await getLocalUserId(req.user!.uid, req.user!.email || '');
    const days = parseInt(req.query.days as string) || 30;

    // Get health score history
    const history = await dashboardService.getInsights(localUserId);
    const healthScoreHistory = history.healthScoreHistory.slice(-days);

    res.json({
      success: true,
      data: {
        history: healthScoreHistory,
        currentScore: history.averageHealthScore,
      },
    });
  } catch (error) {
    console.error('Get health score history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health score history',
    });
  }
}
