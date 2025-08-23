import { z } from 'zod';
import { 
  PortfolioData, 
  Holding, 
  PerformanceData, 
  AIAnalysis, 
  AllocationData,
  HistoryData,
  PortfolioError 
} from '../types/portfolio';

// Zod schemas for validation
const holdingSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(0),
  averagePrice: z.number().min(0),
  currentPrice: z.number().min(0),
  marketValue: z.number().min(0),
  unrealizedPnL: z.number(),
  unrealizedPnLPercent: z.number(),
  dayChange: z.number(),
  dayChangePercent: z.number(),
  allocation: z.number().min(0).max(100),
  sector: z.string(),
  assetType: z.enum(['stock', 'bond', 'etf', 'crypto', 'cash']),
  lastUpdated: z.string(),
});

const allocationSchema = z.object({
  byAssetType: z.record(z.string(), z.number()),
  bySector: z.record(z.string(), z.number()),
  byHolding: z.record(z.string(), z.number()),
  diversificationScore: z.number().min(0).max(100),
});

const portfolioDataSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  totalValue: z.number().min(0),
  cashBalance: z.number().min(0),
  dayChange: z.number(),
  dayChangePercent: z.number(),
  totalReturn: z.number(),
  totalReturnPercent: z.number(),
  holdings: z.array(holdingSchema),
  allocation: allocationSchema,
  lastUpdated: z.string(),
  recentActivities: z.array(z.any()).optional(),
  pendingTransactions: z.array(z.any()).optional(),
});

const performancePointSchema = z.object({
  timestamp: z.string(),
  portfolioValue: z.number().min(0),
  totalReturn: z.number(),
  totalReturnPercent: z.number(),
});

const performanceMetricsSchema = z.object({
  totalReturn: z.number(),
  totalReturnPercent: z.number(),
  annualizedReturn: z.number(),
  volatility: z.number().min(0),
  sharpeRatio: z.number(),
  maxDrawdown: z.number().min(0),
  winRate: z.number().min(0).max(1),
});

const performanceDataSchema = z.object({
  timeRange: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL']),
  dataPoints: z.array(performancePointSchema),
  metrics: performanceMetricsSchema,
  benchmarkComparison: z.object({
    benchmark: z.string(),
    benchmarkReturn: z.number(),
    alpha: z.number(),
    beta: z.number(),
    correlation: z.number().min(-1).max(1),
  }).optional(),
});

const aiRecommendationSchema = z.object({
  id: z.string(),
  type: z.enum(['BUY', 'SELL', 'REBALANCE', 'REDUCE_RISK']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  title: z.string(),
  description: z.string(),
  reasoning: z.string(),
  expectedImpact: z.string(),
  actionable: z.boolean(),
  estimatedCost: z.number().optional(),
  symbol: z.string().optional(),
  targetAllocation: z.number().optional(),
});

const aiAnalysisSchema = z.object({
  analysisId: z.string(),
  timestamp: z.string(),
  healthScore: z.number().min(0).max(100),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  riskAssessment: z.object({
    overallRisk: z.number().min(0).max(100),
    concentrationRisk: z.number().min(0).max(100),
    volatilityRisk: z.number().min(0).max(100),
    correlationRisk: z.number().min(0).max(100),
    riskFactors: z.array(z.string()),
  }),
  diversification: z.object({
    score: z.number().min(0).max(100),
    assetClassDiversification: z.number().min(0).max(100),
    sectorDiversification: z.number().min(0).max(100),
    geographicDiversification: z.number().min(0).max(100),
    suggestions: z.array(z.string()),
  }),
  recommendations: z.array(aiRecommendationSchema),
  insights: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  provider: z.string(),
  fallbackActive: z.boolean().optional(),
});

/**
 * Portfolio Data Validation Functions
 */
export class PortfolioValidator {
  /**
   * Validate portfolio data from API response
   */
  static validatePortfolioData(data: unknown): PortfolioData {
    try {
      return portfolioDataSchema.parse(data);
    } catch (error) {
      throw new PortfolioValidationError('Invalid portfolio data', error);
    }
  }

  /**
   * Validate individual holding data
   */
  static validateHolding(data: unknown): Holding {
    try {
      return holdingSchema.parse(data);
    } catch (error) {
      throw new PortfolioValidationError('Invalid holding data', error);
    }
  }

  /**
   * Validate performance data
   */
  static validatePerformanceData(data: unknown): PerformanceData {
    try {
      return performanceDataSchema.parse(data);
    } catch (error) {
      throw new PortfolioValidationError('Invalid performance data', error);
    }
  }

  /**
   * Validate AI analysis data
   */
  static validateAIAnalysis(data: unknown): AIAnalysis {
    try {
      return aiAnalysisSchema.parse(data);
    } catch (error) {
      throw new PortfolioValidationError('Invalid AI analysis data', error);
    }
  }

  /**
   * Validate allocation data
   */
  static validateAllocationData(data: unknown): AllocationData {
    try {
      return allocationSchema.parse(data);
    } catch (error) {
      throw new PortfolioValidationError('Invalid allocation data', error);
    }
  }

  /**
   * Sanitize portfolio data for logging (remove sensitive information)
   */
  static sanitizeForLogging(data: PortfolioData): Partial<PortfolioData> {
    return {
      id: data.id,
      userId: '[REDACTED]',
      totalValue: data.totalValue > 0 ? '[REDACTED]' : 0,
      dayChangePercent: data.dayChangePercent,
      holdings: data.holdings.map(holding => ({
        symbol: holding.symbol,
        assetType: holding.assetType,
        sector: holding.sector,
        allocation: holding.allocation,
        dayChangePercent: holding.dayChangePercent,
        // Remove sensitive financial data
        quantity: '[REDACTED]',
        averagePrice: '[REDACTED]',
        currentPrice: '[REDACTED]',
        marketValue: '[REDACTED]',
        unrealizedPnL: '[REDACTED]',
      })),
      lastUpdated: data.lastUpdated,
    } as any;
  }

  /**
   * Validate user ID format
   */
  static validateUserId(userId: string): boolean {
    return typeof userId === 'string' && userId.length > 0 && userId.trim() !== '';
  }

  /**
   * Validate time range parameter
   */
  static validateTimeRange(timeRange: string): boolean {
    const validRanges = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
    return validRanges.includes(timeRange);
  }

  /**
   * Validate portfolio data consistency
   */
  static validateDataConsistency(portfolio: PortfolioData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if holdings allocation adds up to 100%
    const totalAllocation = portfolio.holdings.reduce((sum, holding) => sum + holding.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.1) {
      warnings.push(`Holdings allocation sums to ${totalAllocation.toFixed(2)}% instead of 100%`);
    }

    // Check if market values match total value
    const holdingsValue = portfolio.holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
    const expectedTotal = holdingsValue + portfolio.cashBalance;
    if (Math.abs(expectedTotal - portfolio.totalValue) > 0.01) {
      warnings.push(`Holdings value (${holdingsValue}) + cash (${portfolio.cashBalance}) doesn't match total value (${portfolio.totalValue})`);
    }

    // Check for negative quantities
    const negativeQuantities = portfolio.holdings.filter(h => h.quantity < 0);
    if (negativeQuantities.length > 0) {
      errors.push(`Found ${negativeQuantities.length} holdings with negative quantities`);
    }

    // Check for missing or invalid symbols
    const invalidSymbols = portfolio.holdings.filter(h => !h.symbol || h.symbol.trim() === '');
    if (invalidSymbols.length > 0) {
      errors.push(`Found ${invalidSymbols.length} holdings with invalid symbols`);
    }

    // Check data freshness
    const lastUpdated = new Date(portfolio.lastUpdated);
    const now = new Date();
    const ageInMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    if (ageInMinutes > 60) {
      warnings.push(`Portfolio data is ${Math.round(ageInMinutes)} minutes old`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Custom error class for portfolio validation errors
 */
export class PortfolioValidationError extends Error {
  public readonly originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'PortfolioValidationError';
    this.originalError = originalError;
  }

  toPortfolioError(): PortfolioError {
    return {
      code: 'VALIDATION_ERROR',
      message: this.message,
      details: this.originalError,
      retryable: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Utility functions for data transformation
 */
export const portfolioUtils = {
  /**
   * Calculate portfolio metrics from holdings
   */
  calculateMetrics(portfolio: PortfolioData) {
    const totalMarketValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalUnrealizedPnL = portfolio.holdings.reduce((sum, h) => sum + h.unrealizedPnL, 0);
    const totalDayChange = portfolio.holdings.reduce((sum, h) => sum + h.dayChange, 0);

    return {
      totalMarketValue,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent: totalMarketValue > 0 ? (totalUnrealizedPnL / totalMarketValue) * 100 : 0,
      totalDayChange,
      totalDayChangePercent: totalMarketValue > 0 ? (totalDayChange / totalMarketValue) * 100 : 0,
      numberOfHoldings: portfolio.holdings.length,
      averageAllocation: portfolio.holdings.length > 0 ? 100 / portfolio.holdings.length : 0,
    };
  },

  /**
   * Sort holdings by specified field
   */
  sortHoldings(holdings: Holding[], field: keyof Holding, direction: 'asc' | 'desc' = 'desc'): Holding[] {
    return [...holdings].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
  },

  /**
   * Filter holdings based on criteria
   */
  filterHoldings(holdings: Holding[], filters: any): Holding[] {
    return holdings.filter(holding => {
      if (filters.search && !holding.symbol.toLowerCase().includes(filters.search.toLowerCase()) && 
          !holding.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      if (filters.sector && holding.sector !== filters.sector) {
        return false;
      }
      
      if (filters.assetType && holding.assetType !== filters.assetType) {
        return false;
      }
      
      if (filters.minValue && holding.marketValue < filters.minValue) {
        return false;
      }
      
      if (filters.maxValue && holding.marketValue > filters.maxValue) {
        return false;
      }
      
      if (filters.performanceFilter) {
        if (filters.performanceFilter === 'gainers' && holding.dayChangePercent <= 0) {
          return false;
        }
        if (filters.performanceFilter === 'losers' && holding.dayChangePercent >= 0) {
          return false;
        }
      }
      
      return true;
    });
  },
};