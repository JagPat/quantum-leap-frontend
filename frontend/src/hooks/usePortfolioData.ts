import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../store';
import { 
  fetchPortfolio, 
  fetchLivePortfolio, 
  fetchPortfolioPerformance,
  fetchHoldings,
  analyzePortfolio,
  setSelectedTimeRange,
  setRealTimeEnabled 
} from '../store/portfolio/portfolioSlice';
import { 
  selectCurrentPortfolio,
  selectSelectedTimeRange,
  selectRealTimeEnabled,
  selectPortfolioLoading,
  selectPortfolioError 
} from '../store/portfolio/portfolioSelectors';
import { portfolioService } from '../services/portfolioService';
import { PortfolioData, TimeRange } from '../types/portfolio';
import { useEffect, useCallback } from 'react';

// Query keys for React Query
export const portfolioQueryKeys = {
  all: ['portfolio'] as const,
  portfolio: (userId: string) => [...portfolioQueryKeys.all, userId] as const,
  holdings: (userId: string) => [...portfolioQueryKeys.portfolio(userId), 'holdings'] as const,
  performance: (userId: string, timeRange: TimeRange) => 
    [...portfolioQueryKeys.portfolio(userId), 'performance', timeRange] as const,
  allocation: (userId: string) => 
    [...portfolioQueryKeys.portfolio(userId), 'allocation'] as const,
  analysis: (userId: string) => 
    [...portfolioQueryKeys.portfolio(userId), 'analysis'] as const,
  summary: (userId: string) => 
    [...portfolioQueryKeys.portfolio(userId), 'summary'] as const,
};

/**
 * Hook for portfolio data with caching and real-time updates
 */
export const usePortfolioData = (userId: string) => {
  const dispatch = useAppDispatch();
  const portfolio = useAppSelector(selectCurrentPortfolio);
  const loading = useAppSelector(selectPortfolioLoading);
  const error = useAppSelector(selectPortfolioError);
  const realTimeEnabled = useAppSelector(selectRealTimeEnabled);

  const queryClient = useQueryClient();

  // React Query for portfolio data
  const portfolioQuery = useQuery({
    queryKey: portfolioQueryKeys.portfolio(userId),
    queryFn: () => portfolioService.getLatestPortfolio(userId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: realTimeEnabled ? 30 * 1000 : false,
    refetchIntervalInBackground: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!userId,
  });

  // Fetch live data
  const fetchLive = useCallback(async () => {
    if (userId) {
      dispatch(fetchLivePortfolio(userId));
    }
  }, [dispatch, userId]);

  // Refresh data
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.portfolio(userId) });
    if (userId) {
      dispatch(fetchPortfolio(userId));
    }
  }, [queryClient, dispatch, userId]);

  return {
    data: portfolioQuery.data || portfolio,
    isLoading: portfolioQuery.isLoading || loading,
    error: portfolioQuery.error || error,
    isStale: portfolioQuery.isStale,
    isFetching: portfolioQuery.isFetching,
    fetchLive,
    refresh,
    realTimeEnabled,
    setRealTimeEnabled: (enabled: boolean) => dispatch(setRealTimeEnabled(enabled)),
  };
};

/**
 * Hook for portfolio performance data
 */
export const usePortfolioPerformance = (userId: string, timeRange?: TimeRange) => {
  const dispatch = useAppDispatch();
  const selectedTimeRange = useAppSelector(selectSelectedTimeRange);
  const effectiveTimeRange = timeRange || selectedTimeRange;

  const performanceQuery = useQuery({
    queryKey: portfolioQueryKeys.performance(userId, effectiveTimeRange),
    queryFn: () => portfolioService.getPortfolioPerformance(userId, effectiveTimeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!userId && !!effectiveTimeRange,
    retry: 2,
  });

  const setTimeRange = useCallback((newTimeRange: TimeRange) => {
    dispatch(setSelectedTimeRange(newTimeRange));
  }, [dispatch]);

  return {
    data: performanceQuery.data,
    isLoading: performanceQuery.isLoading,
    error: performanceQuery.error,
    timeRange: effectiveTimeRange,
    setTimeRange,
    refetch: performanceQuery.refetch,
  };
};

/**
 * Hook for portfolio holdings
 */
export const usePortfolioHoldings = (userId: string) => {
  const holdingsQuery = useQuery({
    queryKey: portfolioQueryKeys.holdings(userId),
    queryFn: () => portfolioService.getHoldings(userId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
    retry: 2,
  });

  return {
    data: holdingsQuery.data || [],
    isLoading: holdingsQuery.isLoading,
    error: holdingsQuery.error,
    refetch: holdingsQuery.refetch,
  };
};

/**
 * Hook for portfolio allocation
 */
export const usePortfolioAllocation = (userId: string) => {
  const allocationQuery = useQuery({
    queryKey: portfolioQueryKeys.allocation(userId),
    queryFn: () => portfolioService.getAllocation(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!userId,
    retry: 2,
  });

  return {
    data: allocationQuery.data,
    isLoading: allocationQuery.isLoading,
    error: allocationQuery.error,
    refetch: allocationQuery.refetch,
  };
};

/**
 * Hook for AI portfolio analysis
 */
export const usePortfolioAnalysis = (userId: string) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const analysisMutation = useMutation({
    mutationFn: (portfolioData: PortfolioData) => 
      portfolioService.analyzePortfolio(userId, portfolioData),
    onSuccess: (data) => {
      // Update cache with analysis results
      queryClient.setQueryData(portfolioQueryKeys.analysis(userId), data);
      // Also update Redux store
      dispatch(analyzePortfolio.fulfilled(data, '', { userId, portfolioData: {} as PortfolioData }));
    },
    onError: (error) => {
      dispatch(analyzePortfolio.rejected(error as any, '', { userId, portfolioData: {} as PortfolioData }));
    },
  });

  // Get cached analysis
  const cachedAnalysis = queryClient.getQueryData(portfolioQueryKeys.analysis(userId));

  return {
    analyze: analysisMutation.mutate,
    data: cachedAnalysis,
    isLoading: analysisMutation.isPending,
    error: analysisMutation.error,
    isSuccess: analysisMutation.isSuccess,
    reset: analysisMutation.reset,
  };
};

/**
 * Hook for real-time portfolio updates
 */
export const useRealTimePortfolio = (userId: string, interval: number = 30000) => {
  const realTimeEnabled = useAppSelector(selectRealTimeEnabled);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!realTimeEnabled || !userId) return;

    const updateData = async () => {
      try {
        // Check if market is open (simplified check)
        const now = new Date();
        const isMarketHours = isWithinMarketHours(now);
        
        if (isMarketHours) {
          // Invalidate and refetch portfolio data
          queryClient.invalidateQueries({ 
            queryKey: portfolioQueryKeys.portfolio(userId) 
          });
          
          // Also update Redux store
          dispatch(fetchLivePortfolio(userId));
        }
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    };

    const intervalId = setInterval(updateData, interval);

    return () => clearInterval(intervalId);
  }, [realTimeEnabled, userId, interval, dispatch, queryClient]);

  return {
    realTimeEnabled,
    setRealTimeEnabled: (enabled: boolean) => dispatch(setRealTimeEnabled(enabled)),
  };
};

/**
 * Hook for portfolio summary data
 */
export const usePortfolioSummary = (userId: string) => {
  const summaryQuery = useQuery({
    queryKey: portfolioQueryKeys.summary(userId),
    queryFn: () => portfolioService.getPortfolioSummary(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!userId,
    retry: 2,
  });

  return {
    data: summaryQuery.data,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error,
    refetch: summaryQuery.refetch,
  };
};

/**
 * Hook for multiple time range performance data
 */
export const useMultiTimeRangePerformance = (userId: string, timeRanges: TimeRange[]) => {
  const queries = timeRanges.map(timeRange => ({
    queryKey: portfolioQueryKeys.performance(userId, timeRange),
    queryFn: () => portfolioService.getPortfolioPerformance(userId, timeRange),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
  }));

  const results = useQuery({
    queryKey: ['multiTimeRangePerformance', userId, timeRanges],
    queryFn: async () => {
      const promises = timeRanges.map(timeRange => 
        portfolioService.getPortfolioPerformance(userId, timeRange)
      );
      const results = await Promise.allSettled(promises);
      
      return timeRanges.reduce((acc, timeRange, index) => {
        const result = results[index];
        acc[timeRange] = result.status === 'fulfilled' ? result.value : null;
        return acc;
      }, {} as Record<TimeRange, any>);
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!userId && timeRanges.length > 0,
  });

  return {
    data: results.data || {},
    isLoading: results.isLoading,
    error: results.error,
    refetch: results.refetch,
  };
};

// Utility function to check market hours
function isWithinMarketHours(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = date.getHours();
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM EST (simplified)
  return hour >= 9 && hour < 16;
}