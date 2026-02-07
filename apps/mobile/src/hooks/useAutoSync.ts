import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import autoSyncService, { SyncResult } from '../services/autoSyncService';
import { secureStore } from '../services/secureStorage';

const AUTO_SYNC_ENABLED_KEY = 'auto_sync_enabled';
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useAutoSync() {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isQuickLogEnabled, setIsQuickLogEnabled] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Check if auto-sync/quick-log is enabled
  useEffect(() => {
    const loadSettings = async () => {
      if (Platform.OS === 'android') {
        const enabled = await secureStore.getItem(AUTO_SYNC_ENABLED_KEY);
        setIsEnabled(enabled === 'true');
        const permission = await autoSyncService.hasCallLogPermission();
        setHasPermission(permission);
      } else if (Platform.OS === 'ios') {
        const quickLogEnabled = await autoSyncService.isQuickLogEnabled();
        setIsQuickLogEnabled(quickLogEnabled);
        setIsEnabled(quickLogEnabled);
        setHasPermission(true); // iOS doesn't need special permission for quick log
      }
    };
    loadSettings();
  }, []);

  // Get last sync time
  const { data: lastSyncTime, refetch: refetchLastSync } = useQuery({
    queryKey: ['lastSyncTime'],
    queryFn: () => autoSyncService.getLastSyncTime(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => autoSyncService.syncCallLogs(),
    onSuccess: (result) => {
      setLastSyncResult(result);
      if (result.created > 0) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['interactions'] });
      }
      refetchLastSync();
    },
  });

  // Quick log mutation
  const quickLogMutation = useMutation({
    mutationFn: ({
      phoneNumber,
      duration,
      direction,
    }: {
      phoneNumber: string;
      duration: number;
      direction: 'incoming' | 'outgoing';
    }) => autoSyncService.quickLogCall(phoneNumber, duration, direction),
    onSuccess: (result) => {
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    },
  });

  // Enable auto-sync (Android) or quick-log (iOS)
  const enableAutoSync = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await autoSyncService.enableQuickLog();
      setIsQuickLogEnabled(true);
      setIsEnabled(true);
      return true;
    }

    // Android
    const granted = await autoSyncService.requestCallLogPermission();
    if (granted) {
      await secureStore.setItem(AUTO_SYNC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      setHasPermission(true);
      // Do initial sync
      syncMutation.mutate();
      return true;
    }
    return false;
  }, [syncMutation]);

  // Disable auto-sync (Android) or quick-log (iOS)
  const disableAutoSync = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await autoSyncService.disableQuickLog();
      setIsQuickLogEnabled(false);
    } else {
      await secureStore.setItem(AUTO_SYNC_ENABLED_KEY, 'false');
    }
    setIsEnabled(false);
  }, []);

  // Auto-sync on app foreground (Android) or check pending calls (iOS)
  useEffect(() => {
    if (!isEnabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Check if coming back to active from background/inactive
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (Platform.OS === 'ios' && isQuickLogEnabled) {
          // iOS: Check for pending call to log
          autoSyncService.checkPendingCallOnForeground();
        } else if (Platform.OS === 'android' && hasPermission) {
          // Android: Check if enough time has passed since last sync
          if (lastSyncTime) {
            const timeSinceSync = Date.now() - lastSyncTime.getTime();
            if (timeSinceSync >= SYNC_INTERVAL) {
              syncMutation.mutate();
            }
          } else {
            syncMutation.mutate();
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isEnabled, hasPermission, isQuickLogEnabled, lastSyncTime, syncMutation]);

  // Periodic sync while app is active
  useEffect(() => {
    if (!isEnabled || !hasPermission) return;

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncMutation.mutate();
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [isEnabled, hasPermission, syncMutation]);

  return {
    isEnabled,
    hasPermission,
    isAndroid: Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
    isQuickLogEnabled,
    lastSyncTime,
    lastSyncResult,
    isSyncing: syncMutation.isPending,
    syncNow: () => syncMutation.mutate(),
    enableAutoSync,
    disableAutoSync,
    quickLogCall: quickLogMutation.mutate,
    isQuickLogging: quickLogMutation.isPending,
  };
}

/**
 * Hook for logging interactions manually
 */
export function useLogInteraction(contactId: string) {
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: ({
      type,
      date,
      duration,
      notes,
    }: {
      type: 'CALL' | 'TEXT' | 'VIDEO_CALL' | 'IN_PERSON' | 'EVENT';
      date: Date;
      duration?: number;
      notes?: string;
    }) => autoSyncService.logInteraction(contactId, type, date, duration, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['interactions', contactId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return {
    logInteraction: logMutation.mutate,
    isLogging: logMutation.isPending,
    error: logMutation.error,
  };
}
