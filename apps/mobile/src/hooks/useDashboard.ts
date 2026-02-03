import { useQuery } from '@tanstack/react-query';
import dashboardService from '../services/dashboardService';

/**
 * Hook to fetch dashboard data
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboard(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch insights data
 */
export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: () => dashboardService.getInsights(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch health score history
 */
export function useHealthScoreHistory(days: number = 30) {
  return useQuery({
    queryKey: ['healthScoreHistory', days],
    queryFn: () => dashboardService.getHealthScoreHistory(days),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
