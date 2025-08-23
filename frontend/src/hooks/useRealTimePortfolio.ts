import { useEffect, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { 
  setRealTimeEnabled, 
  setAutoRefreshInterval,
  fetchLivePortfolio,
  updateLastUpdated 
} from '../store/portfolio/portfolioSlice';
import { 
  selectRealTimeEnabled, 
  selectAutoRefreshInterval,
  selectMarketStatus 
} from '../store/portfolio/portfolioSelectors';
import { realTimeUpdater, marketUtils } from '../services/realTimeUpdater';
import { PortfolioData } from '../types/portfolio';

interface UseRealTimePortfolioOptions {
  userId: string;
  enabled?: boolean;
  interval?: number;
  onUpdate?: (data: PortfolioData) => void;
  onError?: (error: any) => void;
}

/**
 * Hook for managing real-time portfolio updates
 */
export const useRealTimePortfolio = ({
  userId,
  enabled = true,
  interval,
  onUpdate,
  onError,
}: UseRealTimePortfolioOptions) => {
  const dispatch = useAppDispatch();
  const realTimeEnabled = useAppSelector(selectRealTimeEnabled);
  const autoRefreshInterval = useAppSelector(selectAutoRefreshInterval);
  const marketStatus = useAppSelector(selectMarketStatus);
  
  const subscriberIdRef = useRef<string>(`${userId}_${Date.now()}`);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Effective settings
  const effectiveEnabled = enabled && realTimeEnabled;
  const effectiveInterval = interval || autoRefreshInterval;

  /**
   * Handle portfolio data updates
   */
  const handleUpdate = useCallback((data: PortfolioData) => {
    dispatch(updateLastUpdated());
    onUpdate?.(data);
  }, [dispatch, onUpdate]);

  /**
   * Handle update errors
   */
  const handleError = useCallback((error: any) => {
    console.error('Real-time portfolio update error:', error);
    onError?.(error);
  }, [onError]);

  /**
   * Start real-time updates
   */
  const startUpdates = useCallback(() => {
    if (!effectiveEnabled || !userId) return;

    // Stop existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to updates
    const unsubscribe = realTimeUpdater.subscribe({
      id: subscriberIdRef.current,
      callback: handleUpdate,
      onError: handleError,
    });

    unsubscribeRef.current = unsubscribe;

    // Start the updater if not already running
    realTimeUpdater.start();
  }, [effectiveEnabled, userId, handleUpdate, handleError]);

  /**
   * Stop real-time updates
   */
  const stopUpdates = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  /**
   * Force an immediate update
   */
  const forceUpdate = useCallback(async () => {
    if (!userId) return;
    
    try {
      await realTimeUpdater.forceUpdate(userId);
    } catch (error) {
      handleError(error);
    }
  }, [userId, handleError]);

  /**
   * Toggle real-time updates
   */
  const toggleRealTime = useCallback((enable: boolean) => {
    dispatch(setRealTimeEnabled(enable));
  }, [dispatch]);

  /**
   * Set update interval
   */
  const setUpdateInterval = useCallback((newInterval: number) => {
    dispatch(setAutoRefreshInterval(newInterval));
  }, [dispatch]);

  // Effect to manage subscription lifecycle
  useEffect(() => {
    if (effectiveEnabled) {
      startUpdates();
    } else {
      stopUpdates();
    }

    return () => {
      stopUpdates();
    };
  }, [effectiveEnabled, startUpdates, stopUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopUpdates();
    };
  }, [stopUpdates]);

  return {
    // State
    isEnabled: effectiveEnabled,
    interval: effectiveInterval,
    marketStatus,
    isMarketOpen: marketUtils.isMarketOpen(),
    
    // Actions
    enable: () => toggleRealTime(true),
    disable: () => toggleRealTime(false),
    toggle: toggleRealTime,
    setInterval: setUpdateInterval,
    forceUpdate,
    
    // Utilities
    timeUntilMarketEvent: marketUtils.formatTimeUntilMarketEvent(),
    updaterStats: realTimeUpdater.getStats(),
  };
};

/**
 * Hook for market status information
 */
export const useMarketStatus = () => {
  const marketStatus = realTimeUpdater.getMarketStatus();
  
  return {
    isOpen: marketStatus.isOpen,
    nextOpen: marketStatus.nextOpen,
    nextClose: marketStatus.nextClose,
    timezone: marketStatus.timezone,
    timeUntilNextEvent: marketUtils.getTimeUntilNextMarketEvent(),
    formattedTimeUntilEvent: marketUtils.formatTimeUntilMarketEvent(),
  };
};

/**
 * Hook for managing update intervals based on market status
 */
export const useAdaptiveUpdateInterval = (userId: string) => {
  const dispatch = useAppDispatch();
  const { isOpen } = useMarketStatus();
  
  useEffect(() => {
    // Adjust interval based on market status
    const interval = isOpen ? 30000 : 300000; // 30s during market hours, 5m after hours
    dispatch(setAutoRefreshInterval(interval));
  }, [isOpen, dispatch]);

  return {
    currentInterval: isOpen ? 30000 : 300000,
    isMarketHours: isOpen,
  };
};

/**
 * Hook for connection status and health monitoring
 */
export const useConnectionHealth = () => {
  const stats = realTimeUpdater.getStats();
  
  const getConnectionStatus = () => {
    if (!stats.isRunning) return 'disconnected';
    if (stats.consecutiveErrors > 0) return 'unstable';
    return 'connected';
  };

  const getHealthColor = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'connected': return 'green';
      case 'unstable': return 'yellow';
      case 'disconnected': return 'red';
      default: return 'gray';
    }
  };

  return {
    status: getConnectionStatus(),
    color: getHealthColor(),
    isConnected: stats.isRunning && stats.consecutiveErrors === 0,
    lastUpdate: stats.lastUpdateTime,
    subscriberCount: stats.subscriberCount,
    consecutiveErrors: stats.consecutiveErrors,
  };
};