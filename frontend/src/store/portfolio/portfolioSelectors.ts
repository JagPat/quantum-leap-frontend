import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { PortfolioData, Holding, TimeRange } from '../../types/portfolio';
import { portfolioUtils } from '../../utils/portfolioValidation';

// Base selectors
export const selectPortfolioState = (state: RootState) => state.portfolio;
export const selectCurrentPortfolio = (state: RootState) => state.portfolio.currentPortfolio;
export const selectHoldings = (state: RootState) => state.portfolio.holdings;
export const selectSelectedTimeRange = (state: RootState) => state.portfolio.selectedTimeRange;
export const selectRealTimeEnabled = (state: RootState) => state.portfolio.realTimeEnabled;
export const selectLastUpdated = (state: RootState) => state.portfolio.lastUpdated;

// Performance selectors
export const selectPerformanceData = createSelector(
  [selectPortfolioState, selectSelectedTimeRange],
  (portfolioState, timeRange) => portfolioState.performance[timeRange]
);

export const selectPerformanceForTimeRange = (timeRange: TimeRange) =>
  createSelector(
    [selectPortfolioState],
    (portfolioState) => portfolioState.performance[timeRange]
  );

// Loading selectors
export const selectPortfolioLoading = (state: RootState) => state.portfolio.loading.portfolio;
export const selectHoldingsLoading = (state: RootState) => state.portfolio.loading.holdings;
export const selectPerformanceLoading = createSelector(
  [selectPortfolioState, selectSelectedTimeRange],
  (portfolioState, timeRange) => portfolioState.loading.performance[timeRange]
);
export const selectAIAnalysisLoading = (state: RootState) => state.portfolio.loading.aiAnalysis;

// Error selectors
export const selectPortfolioError = (state: RootState) => state.portfolio.errors.portfolio;
export const selectHoldingsError = (state: RootState) => state.portfolio.errors.holdings;
export const selectPerformanceError = createSelector(
  [selectPortfolioState, selectSelectedTimeRange],
  (portfolioState, timeRange) => portfolioState.errors.performance[timeRange]
);
export const selectAIAnalysisError = (state: RootState) => state.portfolio.errors.aiAnalysis;

// AI Analysis selectors
export const selectAIAnalysis = (state: RootState) => state.portfolio.aiAnalysis;
export const selectPortfolioHealthScore = createSelector(
  [selectAIAnalysis],
  (analysis) => analysis?.healthScore || null
);
export const selectAIRecommendations = createSelector(
  [selectAIAnalysis],
  (analysis) => analysis?.recommendations || []
);

// Computed selectors
export const selectPortfolioMetrics = createSelector(
  [selectCurrentPortfolio],
  (portfolio) => {
    if (!portfolio) return null;
    return portfolioUtils.calculateMetrics(portfolio);
  }
);

export const selectTopHoldings = createSelector(
  [selectHoldings],
  (holdings) => {
    return portfolioUtils.sortHoldings(holdings, 'marketValue', 'desc').slice(0, 5);
  }
);

export const selectHoldingsByPerformance = createSelector(
  [selectHoldings],
  (holdings) => {
    const gainers = holdings.filter(h => h.dayChangePercent > 0)
      .sort((a, b) => b.dayChangePercent - a.dayChangePercent)
      .slice(0, 5);
    
    const losers = holdings.filter(h => h.dayChangePercent < 0)
      .sort((a, b) => a.dayChangePercent - b.dayChangePercent)
      .slice(0, 5);
    
    return { gainers, losers };
  }
);

export const selectAllocationData = createSelector(
  [selectCurrentPortfolio],
  (portfolio) => portfolio?.allocation || null
);

export const selectSectorAllocation = createSelector(
  [selectAllocationData],
  (allocation) => allocation?.bySector || {}
);

export const selectAssetTypeAllocation = createSelector(
  [selectAllocationData],
  (allocation) => allocation?.byAssetType || {}
);

export const selectDiversificationScore = createSelector(
  [selectAllocationData],
  (allocation) => allocation?.diversificationScore || 0
);

// Portfolio summary selectors
export const selectPortfolioSummary = createSelector(
  [selectCurrentPortfolio, selectPortfolioMetrics],
  (portfolio, metrics) => {
    if (!portfolio || !metrics) return null;
    
    return {
      totalValue: portfolio.totalValue,
      cashBalance: portfolio.cashBalance,
      dayChange: portfolio.dayChange,
      dayChangePercent: portfolio.dayChangePercent,
      totalReturn: portfolio.totalReturn,
      totalReturnPercent: portfolio.totalReturnPercent,
      numberOfHoldings: metrics.numberOfHoldings,
      lastUpdated: portfolio.lastUpdated,
    };
  }
);

// Data freshness selectors
export const selectDataFreshness = createSelector(
  [selectLastUpdated],
  (lastUpdated) => {
    if (!lastUpdated) return null;
    
    const now = new Date();
    const updated = new Date(lastUpdated);
    const ageInMinutes = (now.getTime() - updated.getTime()) / (1000 * 60);
    
    return {
      lastUpdated,
      ageInMinutes,
      isStale: ageInMinutes > 5, // Consider stale after 5 minutes
      isFresh: ageInMinutes < 1, // Consider fresh within 1 minute
    };
  }
);

// Loading state aggregators
export const selectAnyLoading = createSelector(
  [selectPortfolioState],
  (portfolioState) => {
    return (
      portfolioState.loading.portfolio ||
      portfolioState.loading.livePortfolio ||
      portfolioState.loading.holdings ||
      portfolioState.loading.aiAnalysis ||
      Object.values(portfolioState.loading.performance).some(loading => loading)
    );
  }
);

export const selectCriticalLoading = createSelector(
  [selectPortfolioLoading, selectHoldingsLoading],
  (portfolioLoading, holdingsLoading) => {
    return portfolioLoading || holdingsLoading;
  }
);

// Error state aggregators
export const selectAnyError = createSelector(
  [selectPortfolioState],
  (portfolioState) => {
    return (
      portfolioState.errors.portfolio ||
      portfolioState.errors.holdings ||
      portfolioState.errors.aiAnalysis ||
      Object.values(portfolioState.errors.performance).some(error => error !== null)
    );
  }
);

export const selectCriticalErrors = createSelector(
  [selectPortfolioError, selectHoldingsError],
  (portfolioError, holdingsError) => {
    const errors = [];
    if (portfolioError) errors.push(portfolioError);
    if (holdingsError) errors.push(holdingsError);
    return errors;
  }
);

// Holdings filtering and sorting selectors
export const selectFilteredHoldings = (filters: any) =>
  createSelector(
    [selectHoldings],
    (holdings) => portfolioUtils.filterHoldings(holdings, filters)
  );

export const selectSortedHoldings = (field: keyof Holding, direction: 'asc' | 'desc') =>
  createSelector(
    [selectHoldings],
    (holdings) => portfolioUtils.sortHoldings(holdings, field, direction)
  );

// Market status selectors
export const selectMarketStatus = createSelector(
  [selectDataFreshness, selectRealTimeEnabled],
  (freshness, realTimeEnabled) => {
    const now = new Date();
    const isMarketHours = isWithinMarketHours(now);
    
    return {
      isMarketOpen: isMarketHours,
      realTimeEnabled,
      shouldUpdate: isMarketHours && realTimeEnabled,
      dataFreshness: freshness,
    };
  }
);

// Utility function to check market hours (simplified)
function isWithinMarketHours(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = date.getHours();
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM EST (simplified)
  return hour >= 9 && hour < 16;
}

// Performance comparison selectors
export const selectPerformanceComparison = createSelector(
  [selectPerformanceData],
  (performanceData) => {
    if (!performanceData?.benchmarkComparison) return null;
    
    const { benchmarkComparison } = performanceData;
    return {
      benchmark: benchmarkComparison.benchmark,
      portfolioReturn: performanceData.metrics.totalReturnPercent,
      benchmarkReturn: benchmarkComparison.benchmarkReturn,
      alpha: benchmarkComparison.alpha,
      beta: benchmarkComparison.beta,
      outperforming: performanceData.metrics.totalReturnPercent > benchmarkComparison.benchmarkReturn,
    };
  }
);

// Risk assessment selectors
export const selectRiskAssessment = createSelector(
  [selectAIAnalysis],
  (analysis) => {
    if (!analysis?.riskAssessment) return null;
    
    return {
      overallRisk: analysis.riskAssessment.overallRisk,
      riskLevel: analysis.riskLevel,
      concentrationRisk: analysis.riskAssessment.concentrationRisk,
      volatilityRisk: analysis.riskAssessment.volatilityRisk,
      correlationRisk: analysis.riskAssessment.correlationRisk,
      riskFactors: analysis.riskAssessment.riskFactors,
    };
  }
);