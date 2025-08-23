// Portfolio Data Models
export interface PortfolioData {
  id: string;
  userId: string;
  totalValue: number;
  cashBalance: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdings: Holding[];
  allocation: AllocationData;
  lastUpdated: string;
  recentActivities?: Activity[];
  pendingTransactions?: Transaction[];
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: number; // Percentage of portfolio
  sector: string;
  assetType: 'stock' | 'bond' | 'etf' | 'crypto' | 'cash';
  lastUpdated: string;
}

export interface AllocationData {
  byAssetType: Record<string, number>;
  bySector: Record<string, number>;
  byHolding: Record<string, number>;
  diversificationScore: number;
}

export interface PerformanceData {
  timeRange: TimeRange;
  dataPoints: PerformancePoint[];
  metrics: PerformanceMetrics;
  benchmarkComparison?: BenchmarkComparison;
}

export interface PerformancePoint {
  timestamp: string;
  portfolioValue: number;
  totalReturn: number;
  totalReturnPercent: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
}

export interface BenchmarkComparison {
  benchmark: string;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  correlation: number;
}

export interface HistoryData {
  snapshots: PortfolioSnapshot[];
  transactions: Transaction[];
  events: PortfolioEvent[];
}

export interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
  holdings: Holding[];
  allocation: AllocationData;
}

export interface Transaction {
  id: string;
  timestamp: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fees?: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface Activity {
  id: string;
  timestamp: string;
  type: 'TRADE' | 'DIVIDEND' | 'PRICE_CHANGE' | 'ALLOCATION_CHANGE';
  description: string;
  impact: number;
  impactPercent: number;
}

export interface PortfolioEvent {
  id: string;
  timestamp: string;
  type: 'REBALANCE' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND';
  description: string;
  impact: number;
}

// AI Analysis Models
export interface AIAnalysis {
  analysisId: string;
  timestamp: string;
  healthScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskAssessment: RiskAssessment;
  diversification: DiversificationAnalysis;
  recommendations: AIRecommendation[];
  insights: string[];
  confidence: number;
  provider: string;
  fallbackActive?: boolean;
}

export interface RiskAssessment {
  overallRisk: number; // 0-100
  concentrationRisk: number;
  volatilityRisk: number;
  correlationRisk: number;
  riskFactors: string[];
}

export interface DiversificationAnalysis {
  score: number; // 0-100
  assetClassDiversification: number;
  sectorDiversification: number;
  geographicDiversification: number;
  suggestions: string[];
}

export interface AIRecommendation {
  id: string;
  type: 'BUY' | 'SELL' | 'REBALANCE' | 'REDUCE_RISK';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  reasoning: string;
  expectedImpact: string;
  actionable: boolean;
  estimatedCost?: number;
  symbol?: string;
  targetAllocation?: number;
}

// Utility Types
export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface HoldingFilters {
  search?: string;
  sector?: string;
  assetType?: string;
  minValue?: number;
  maxValue?: number;
  performanceFilter?: 'gainers' | 'losers' | 'all';
}

// API Response Types
export interface PortfolioAPIResponse<T = any> {
  status: 'success' | 'error' | 'fallback';
  data?: T;
  message?: string;
  timestamp: string;
  fallbackActive?: boolean;
}

export interface PortfolioError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: string;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface PortfolioCacheConfig {
  portfolioTTL: number; // Time to live for portfolio data
  performanceTTL: number; // Time to live for performance data
  holdingsTTL: number; // Time to live for holdings data
  maxCacheSize: number; // Maximum number of cache entries
}