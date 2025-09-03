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
import { brokerAPI } from './brokerAPI';

/**
 * Portfolio Service
 * Handles all portfolio-related API calls with caching, error handling, and validation
 */
export class PortfolioService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private useLiveData: boolean;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'https://web-production-de0bc.up.railway.app';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.useLiveData = true; // Enable live data by default
  }

  /**
   * Check if user has active broker connection
   */
  private async checkBrokerConnection(userId: string): Promise<boolean> {
    try {
      const status = await brokerAPI.checkConnectionStatus(null, userId);
      return status.isConnected && status.connectionStatus.state === 'connected';
    } catch (error) {
      console.warn('Failed to check broker connection:', error);
      return false;
    }
  }

  /**
   * Get portfolio data source (live broker data or mock data)
   */
  private async getDataSource(userId: string): Promise<'live' | 'mock'> {
    if (!this.useLiveData) {
      return 'mock';
    }

    const hasConnection = await this.checkBrokerConnection(userId);
    return hasConnection ? 'live' : 'mock';
  }

  /**
   * Get latest portfolio data (cached)
   * Uses live broker data if connected, otherwise falls back to mock data
   * Endpoint: GET /api/portfolio/latest-simple
   */
  async getLatestPortfolio(userId: string): Promise<PortfolioData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    const dataSource = await this.getDataSource(userId);
    const cacheKey = cacheKeys.portfolio(userId) + `_${dataSource}`;
    
    // Check cache first
    const cached = portfolioCache.get<PortfolioData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let response: PortfolioData;
      
      if (dataSource === 'live') {
        // Use live broker data
        response = await this.fetchLiveBrokerData(userId);
      } else {
        // Use mock data
        response = await this.makeRequest<PortfolioData>(
          `/api/portfolio/latest-simple?user_id=${userId}`,
          { method: 'GET' }
        );
      }

      const validatedData = PortfolioValidator.validatePortfolioData(response);
      
      // Cache the validated data (shorter cache for live data)
      const cacheTime = dataSource === 'live' ? 30000 : 300000; // 30s for live, 5min for mock
      portfolioCache.set(cacheKey, validatedData, cacheTime);
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch latest portfolio');
    }
  }

  /**
   * Fetch live portfolio data (real-time)
   * Always tries to use live broker data if connected
   * Endpoint: GET /api/portfolio/fetch-live
   */
  async fetchLivePortfolio(userId: string): Promise<PortfolioData> {
    if (!PortfolioValidator.validateUserId(userId)) {
      throw new PortfolioValidationError('Invalid user ID');
    }

    try {
      const dataSource = await this.getDataSource(userId);
      let response: PortfolioData;
      
      if (dataSource === 'live') {
        // Use live broker data
        response = await this.fetchLiveBrokerData(userId);
      } else {
        // Fallback to mock live data
        response = await this.makeRequest<PortfolioData>(
          `/api/portfolio/fetch-live?user_id=${userId}`,
          { method: 'GET' }
        );
      }

      const validatedData = PortfolioValidator.validatePortfolioData(response);
      
      // Update cache with fresh data
      const cacheKey = cacheKeys.portfolio(userId) + `_${dataSource}`;
      portfolioCache.set(cacheKey, validatedData, 30000); // 30 seconds for live data
      
      return validatedData;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch live portfolio');
    }
  }

  /**
   * Fetch live data from broker API
   */
  private async fetchLiveBrokerData(userId: string): Promise<PortfolioData> {
    try {
      // Get broker configurations
      const configs = await brokerAPI.getBrokerConfigs(userId);
      const activeConfig = configs.find(config => config.isConnected);
      
      if (!activeConfig) {
        throw new Error('No active broker connection found');
      }

      // Fetch live data from broker-integrated endpoints
      const [holdings, positions, margins] = await Promise.all([
        this.makeRequest<any>(`/api/broker/holdings?config_id=${activeConfig.id}`, { method: 'GET' }),
        this.makeRequest<any>(`/api/broker/positions?config_id=${activeConfig.id}`, { method: 'GET' }),
        this.makeRequest<any>(`/api/broker/margins?config_id=${activeConfig.id}`, { method: 'GET' })
      ]);

      // Transform broker data to portfolio format
      return this.transformBrokerDataToPortfolio(holdings, positions, margins);
    } catch (error) {
      console.warn('Failed to fetch live broker data, falling back to mock:', error);
      // Fallback to mock data if broker data fails
      return this.makeRequest<PortfolioData>(
        `/api/portfolio/fetch-live?user_id=${userId}`,
        { method: 'GET' }
      );
    }
  }

  /**
   * Transform broker API data to portfolio format
   */
  private transformBrokerDataToPortfolio(holdings: any, positions: any, margins: any): PortfolioData {
    // Calculate total value from holdings
    const totalValue = holdings.reduce((sum: number, holding: any) => {
      return sum + (holding.quantity * holding.lastPrice);
    }, 0);

    // Calculate day change from positions
    const dayChange = positions.net?.reduce((sum: number, position: any) => {
      return sum + (position.pnl || 0);
    }, 0) || 0;

    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    // Transform holdings to portfolio format
    const portfolioHoldings = holdings.map((holding: any) => ({
      symbol: holding.tradingsymbol,
      quantity: holding.quantity,
      price: holding.lastPrice,
      value: holding.quantity * holding.lastPrice,
      change: holding.dayChange || 0,
      changePercent: holding.dayChangePercentage || 0,
      exchange: holding.exchange,
      product: holding.product
    }));

    return {
      totalValue,
      dayChange,
      dayChangePercent,
      positions: portfolioHoldings,
      cash: margins?.equity?.available?.cash || 0,
      lastUpdated: new Date().toISOString(),
      isLive: true,
      dataSource: 'broker'
    };
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
   * Enable or disable live data usage
   */
  setLiveDataEnabled(enabled: boolean): void {
    this.useLiveData = enabled;
    // Clear cache when switching data sources
    portfolioCache.clear();
  }

  /**
   * Check if live data is enabled
   */
  isLiveDataEnabled(): boolean {
    return this.useLiveData;
  }

  /**
   * Get current data source for user
   */
  async getCurrentDataSource(userId: string): Promise<'live' | 'mock'> {
    return this.getDataSource(userId);
  }

  /**
   * Force refresh of portfolio data (clears cache)
   */
  async refreshPortfolioData(userId: string): Promise<void> {
    // Clear all cache entries for this user
    this.clearUserCache(userId);
  }

  /**
   * Health check for portfolio service
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; dataSource?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const brokerHealth = await brokerAPI.healthCheck();
      
      return {
        status: response.ok && brokerHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        dataSource: this.useLiveData ? 'live_enabled' : 'mock_only'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        dataSource: 'unknown'
      };
    }
  }
}

// Create singleton instance
export const portfolioService = new PortfolioService();

// Export for testing
export { PortfolioService };