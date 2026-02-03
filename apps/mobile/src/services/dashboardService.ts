import { apiClient } from '../config/api';

// Types
export interface DashboardData {
  healthScore: number;
  healthScoreTrend: number;
  todayReminders: Reminder[];
  upcomingEvents: Event[];
  contactsNeedingAttention: ContactNeedingAttention[];
  savingsSummary: {
    totalSaved: number;
    activeGoals: number;
    nearestDeadline: string | null;
  };
  tipOfTheDay: string;
}

export interface InsightsData {
  communicationTrends: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    byType: {
      call: number;
      text: number;
      inPerson: number;
    };
  };
  tierDistribution: Record<string, number>;
  topContacts: TopContact[];
  neglectedTiers: string[];
  averageHealthScore: number;
  healthScoreHistory: { date: string; score: number }[];
}

export interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string;
  scheduledDate: string;
  status: string;
  contact?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  event?: {
    id: string;
    title: string;
  };
}

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName?: string;
  attendees?: Array<{
    contact: {
      id: string;
      name: string;
      profileImage?: string;
    };
  }>;
}

export interface ContactNeedingAttention {
  id: string;
  name: string;
  profileImage?: string;
  tier: string;
  daysOverdue: number;
  lastContactDate?: string;
}

export interface TopContact {
  id: string;
  name: string;
  profileImage?: string;
  interactionCount: number;
  tier: string;
}

/**
 * Dashboard Service
 * Handles dashboard API calls
 */
class DashboardService {
  /**
   * Get dashboard data
   */
  async getDashboard(): Promise<DashboardData> {
    const response = await apiClient.get('/dashboard');
    return response.data.data;
  }

  /**
   * Get insights data
   */
  async getInsights(): Promise<InsightsData> {
    const response = await apiClient.get('/dashboard/insights');
    return response.data.data;
  }

  /**
   * Get health score history
   */
  async getHealthScoreHistory(days: number = 30): Promise<{
    history: { date: string; score: number }[];
    currentScore: number;
  }> {
    const response = await apiClient.get('/dashboard/health-score/history', {
      params: { days },
    });
    return response.data.data;
  }
}

export default new DashboardService();
