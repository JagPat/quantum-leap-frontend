import { 
  PortfolioData, 
  PerformanceData, 
  AIAnalysis, 
  AllocationData, 
  HistoryData, 
  Holding,
  TimeRange,
  PortfolioAPIResponse,
  PortfolioError 
} from '../types/portfolio';
import { PortfolioValidator, PortfolioValidationError } from '../utils/portfolioValidation';
import { portfolioCache, cacheKeys } from '../utils/portfolioCache';

/**
 * Portfolio Service
 * Handles all portfolio-related API calls with caching, error handling, and validation
 */
export class PortfolioService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'https://web-production-de0bc.up.railway.app';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get latest portfolio data (cached)
   * Endpoint: GET /api/portfolio/latest-simple
   */
  async getLatestPortfolio(userId: string): Promise<PortfolioData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    const cacheKey = cacheKeys.portfolio(userId);
    
    // Check cache first
    const cached = portfolioCache.get<PortfolioData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest<PortfolioData>(
        `/api/portfolio/latest-simple?user_id=${userId}`,
        { method: 'GET' }
      );

      const validatedData = PortfolioValidator.validatePortfolioData(response);
      
      // Cache the validated data
      portfolioCache.set(cacheKey, validatedData);
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch latest portfolio');
    }
  }

  /**
   * Fetch live portfolio data (real-time)
   * Endpoint: GET /api/portfolio/fetch-live
   */
  async fetchLivePortfolio(userId: string): Promise<PortfolioData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    try {
      const response = await this.makeRequest<PortfolioData>(
        `/api/portfolio/fetch-live?user_id=${userId}`,
        { method: 'GET' }
      );

      const validatedData = PortfolioValidator.validatePortfolioData(response);
      
      // Update cache with fresh data
      const cacheKey = cacheKeys.portfolio(userId);
      portfolioCache.set(cacheKey, validatedData, 30000); // 30 seconds for live data
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch live portfolio');
    }
  }

  /**
   * Get portfolio history
   * Endpoint: GET /api/portfolio/history
   */
  async getPortfolioHistory(userId: string, timeRange: TimeRange): Promise<HistoryData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    if (!PortfolioValidator.validateTimeRange(timeRange)) {
      throw new PortfolioValidationError('Invalid time range');
    }

    const cacheKey = cacheKeys.history(userId, timeRange);
    
    // Check cache first
    const cached = portfolioCache.get<HistoryData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest<HistoryData>(
        `/api/portfolio/history?user_id=${userId}&time_range=${timeRange}`,
        { method: 'GET' }
      );

      // Cache the data
      portfolioCache.set(cacheKey, response);
      
      return response;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch portfolio history');
    }
  }

  /**
   * Get portfolio performance data
   * Endpoint: GET /api/portfolio/performance
   */
  async getPortfolioPerformance(userId: string, timeRange: TimeRange): Promise<PerformanceData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    if (!PortfolioValidator.validateTimeRange(timeRange)) {
      throw new PortfolioValidationError('Invalid time range');
    }

    const cacheKey = cacheKeys.performance(userId, timeRange);
    
    // Check cache first
    const cached = portfolioCache.get<PerformanceData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest<PerformanceData>(
        `/api/portfolio/performance?user_id=${userId}&time_range=${timeRange}`,
        { method: 'GET' }
      );

      const validatedData = PortfolioValidator.validatePerformanceData(response);
      
      // Cache the validated data
      portfolioCache.set(cacheKey, validatedData);
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch portfolio performance');
    }
  }

  /**
   * Get portfolio summary
   * Endpoint: GET /api/portfolio/summary
   */
  async getPortfolioSummary(userId: string): Promise<any> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    const cacheKey = cacheKeys.summary(userId);
    
    // Check cache first
    const cached = portfolioCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest<any>(
        `/api/portfolio/summary?user_id=${userId}`,
        { method: 'GET' }
      );

      // Cache the data
      portfolioCache.set(cacheKey, response);
      
      return response;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch portfolio summary');
    }
  }

  /**
   * Analyze portfolio with AI
   * Endpoint: POST /api/portfolio/analyze
   */
  async analyzePortfolio(userId: string, portfolioData: PortfolioData): Promise<AIAnalysis> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    try {
      const response = await this.makeRequest<AIAnalysis>(
        '/api/portfolio/analyze',
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            portfolio_data: portfolioData,
            analysis_type: 'comprehensive',
          }),
        }
      );

      const validatedData = PortfolioValidator.validateAIAnalysis(response);
      
      // Cache the analysis
      const cacheKey = cacheKeys.analysis(userId);
      portfolioCache.set(cacheKey, validatedData, 10 * 60 * 1000); // 10 minutes
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze portfolio');
    }
  }

  /**
   * Get portfolio holdings
   * Endpoint: GET /api/portfolio/holdings
   */
  async getHoldings(userId: string): Promise<Holding[]> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    const cacheKey = cacheKeys.holdings(userId);
    
    // Check cache first
    const cached = portfolioCache.get<Holding[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest<Holding[]>(
        `/api/portfolio/holdings?user_id=${userId}`,
        { method: 'GET' }
      );

      // Validate each holding
      const validatedHoldings = response.map(holding => 
        PortfolioValidator.validateHolding(holding)
      );
      
      // Cache the validated data
      portfolioCache.set(cacheKey, validatedHoldings);
      
      return validatedHoldings;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch holdings');
    }
  }

  /**
   * Get portfolio allocation
   * Endpoint: GET /api/portfolio/allocation
   */
  async getAllocation(userId: string): Promise<AllocationData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    const cacheKey = cacheKeys.allocation(userId);
    
    // Check cache first
    const cached = portfolioCache.get<AllocationData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.makeRequest<AllocationData>(
        `/api/portfolio/allocation?user_id=${userId}`,
        { method: 'GET' }
      );

      const validatedData = PortfolioValidator.validateAllocationData(response);
      
      // Cache the validated data
      portfolioCache.set(cacheKey, validatedData);
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch allocation');
    }
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle API response wrapper
      if (data.status) {
        if (data.status === 'error') {
          throw new Error(data.message || 'API returned error status');
        }
        return data.data || data;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        // Network or parsing error
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any, context: string): PortfolioError {
    let portfolioError: PortfolioError;

    if (error instanceof PortfolioValidationError) {
      portfolioError = error.toPortfolioError();
    } else if (error instanceof Error) {
      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);
      
      portfolioError = {
        code: this.getErrorCode(error),
        message: `${context}: ${error.message}`,
        details: error,
        retryable: isRetryable,
        timestamp: new Date().toISOString(),
      };
    } else {
      portfolioError = {
        code: 'UNKNOWN_ERROR',
        message: `${context}: Unknown error occurred`,
        details: error,
        retryable: true,
        timestamp: new Date().toISOString(),
      };
    }

    // Log error for debugging (sanitized)
    console.error('Portfolio Service Error:', {
      code: portfolioError.code,
      message: portfolioError.message,
      retryable: portfolioError.retryable,
      timestamp: portfolioError.timestamp,
    });

    throw portfolioError;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /502/,
      /503/,
      /504/,
      /connection/i,
      /fetch/i,
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: Error): string {
    if (error.message.includes('401')) return 'UNAUTHORIZED';
    if (error.message.includes('403')) return 'FORBIDDEN';
    if (error.message.includes('404')) return 'NOT_FOUND';
    if (error.message.includes('429')) return 'RATE_LIMITED';
    if (error.message.includes('500')) return 'SERVER_ERROR';
    if (error.message.includes('502')) return 'BAD_GATEWAY';
    if (error.message.includes('503')) return 'SERVICE_UNAVAILABLE';
    if (error.message.includes('504')) return 'GATEWAY_TIMEOUT';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('timeout')) return 'TIMEOUT';
    return 'API_ERROR';
  }

  /**
   * Clear cache for user
   */
  clearUserCache(userId: string): void {
    portfolioCache.invalidatePattern(userId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return portfolioCache.getStats();
  }

  /**
   * Health check for portfolio service
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
export const portfolioService = new PortfolioService();

// Export for testing
export { PortfolioService };