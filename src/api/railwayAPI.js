// Railway Backend API Service
// Direct API calls to backend for optimal performance

import { config } from '@/config/deployment.js';

const FALLBACK_BACKEND_URL = 'https://web-production-de0bc.up.railway.app';

const detectBackendUrl = () => {
  try {
    if (config?.urls?.backend) {
      return config.urls.backend;
    }
  } catch (error) {
    console.warn('⚠️ [RailwayAPI] Failed to resolve deployment config:', error);
  }
  return FALLBACK_BACKEND_URL;
};

class RailwayAPI {
  constructor() {
    this.baseURL = detectBackendUrl();
    this.pendingRequests = new Map(); // For request deduplication
  }

  // Get authentication headers for Kite Connect API calls
  getAuthHeaders() {
    try {
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected && config.access_token);
      
      if (activeConfig && activeConfig.api_key && activeConfig.access_token) {
        const user_id = activeConfig.user_data?.user_id || activeConfig.user_id || 'unknown';
        console.log('🔐 [RailwayAPI] Using auth headers for user:', user_id);
        return {
          'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,
          'X-User-ID': user_id
        };
      }
      
      console.warn('⚠️ [RailwayAPI] No active broker configuration found for authentication');
      return {};
    } catch (error) {
      console.error('❌ [RailwayAPI] Error getting auth headers:', error);
      return {};
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Create a unique key for this request
    const requestKey = `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || '')}`;
    
    // Check if there's already a pending request for this endpoint
    if (this.pendingRequests.has(requestKey)) {
      console.log(`🔄 [RailwayAPI] Request already pending for ${endpoint}, waiting for result...`);
      return this.pendingRequests.get(requestKey);
    }
    
    // Define which endpoints require authentication
    // IMPORTANT: Broker and portfolio endpoints are authenticated server-side using user_id/config_id,
    // so the frontend MUST NOT block these calls for missing client auth headers.
    // Keep auth requirements only for explicitly protected domains like AI/Trading if needed.
    const requiresAuth = endpoint.includes('/api/trading/') ||
                         endpoint.includes('/api/ai/');
    
    const authHeaders = requiresAuth ? this.getAuthHeaders() : {};
    
    if (requiresAuth && (!authHeaders.Authorization || !authHeaders['X-User-ID'])) {
      console.warn(`⚠️ [RailwayAPI] Missing authorization for authenticated endpoint: ${endpoint}`);
      return { 
          status: 'unauthorized', 
          message: 'Please connect to your broker to access this feature.', 
          data: null,
          requiresAuth: true
      };
    }
    
    const config = {
      method: 'GET', // Default method
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    };

    // Add AbortController signal if provided
    if (options.signal) {
      config.signal = options.signal;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        console.log(`🚀 [RailwayAPI] ${config.method} ${url}`);

        const response = await fetch(url, config);

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ detail: response.statusText }));

         if (response.status === 401 || response.status === 403) {
            const statusKey = response.status === 401 ? 'unauthorized' : 'forbidden';
            console.warn(`⚠️ [RailwayAPI] ${response.status} for ${endpoint} - broker authentication required`, payload);
            return {
              success: false,
              status: statusKey,
              message: payload.error || payload.message || (response.status === 401 ? 'Broker session expired. Please reconnect.' : 'Broker access denied.'),
              code: payload.code || (response.status === 401 ? 'TOKEN_EXPIRED' : 'BROKER_UNAUTHORIZED'),
              needsAuth: payload.needs_reauth ?? true,
              requiresAuth: true,
              needs_reauth: payload.needs_reauth ?? true,
              data: payload.data || null
            };
          }

          if (response.status === 429) {
            console.warn(`⚠️ [RailwayAPI] Rate limited (429) for ${endpoint}`);
            return {
              success: false,
              status: 'rate_limited',
              message: payload.error || payload.message || 'Rate limit reached. Please try again shortly.',
              code: payload.code || 'RATE_LIMIT',
              retryAfter: response.headers.get('Retry-After') || null
            };
          }

          if (response.status === 404) {
            console.warn(`⚠️ [RailwayAPI] Endpoint not found (404) for ${endpoint}`);
            return {
              success: false,
              status: 'not_implemented',
              message: payload.error || payload.message || 'This feature is planned but not yet implemented.',
              endpoint
            };
          }

          const error = new Error(payload.detail || payload.error || `HTTP ${response.status}`);
          error.status = response.status;
          error.payload = payload;
          throw error;
        }

        const data = await response.json().catch(() => ({}));

        console.log(`✅ [RailwayAPI] Success`, { endpoint, hasData: !!data, keys: Object.keys(data || {}) });
        return data;
      } catch (error) {
        console.error(`❌ [RailwayAPI] Error:`, error);
        throw error;
      } finally {
        // Remove the request from pending requests
        this.pendingRequests.delete(requestKey);
      }
    })();

    // Store the request promise
    this.pendingRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  // ========================================
  // Broker Authentication Functions
  // ========================================

  async generateSession(requestToken, apiKey, apiSecret) {
    return this.request('/broker/generate-session', {
      method: 'POST',
      body: JSON.stringify({
        request_token: requestToken,
        api_key: apiKey,
        api_secret: apiSecret,
      }),
    });
  }

  async invalidateSession(userId) {
    return this.request(`/broker/invalidate-session?user_id=${userId}`, {
      method: 'POST',
    });
  }

  async checkConnectionStatus(userId) {
    return this.request(`/broker/session?user_id=${userId}`);
  }

  async getBrokerSession(userId) {
    return this.request(`/broker/session?user_id=${userId}`);
  }

  async getBrokerProfile(userId) {
    return this.request(`/broker/profile?user_id=${userId}`);
  }

  // ========================================
  // Broker Functions (Available Endpoints)
  // ========================================

  async getBrokerStatus() {
    return this.request('/api/broker/status');
  }

  buildQueryParams({ userId = null, configId = null, options = {} } = {}) {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (configId) params.append('config_id', configId);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    return params;
  }

  async getBrokerHoldings(userId, { configId = null, bypassCache = false } = {}) {
    const params = this.buildQueryParams({
      userId,
      configId,
      options: bypassCache ? { bypass_cache: 'true' } : {}
    });
    return this.request(`/api/broker/holdings?${params.toString()}`);
  }

  async getBrokerPositions(userId, { configId = null, bypassCache = false } = {}) {
    const params = this.buildQueryParams({
      userId,
      configId,
      options: bypassCache ? { bypass_cache: 'true' } : {}
    });
    return this.request(`/api/broker/positions?${params.toString()}`);
  }

  async getBrokerOrders(userId, { configId = null, bypassCache = false } = {}) {
    const params = this.buildQueryParams({
      userId,
      configId,
      options: bypassCache ? { bypass_cache: 'true' } : {}
    });
    return this.request(`/api/broker/orders?${params.toString()}`);
  }

  async getBrokerProfile(userId) {
    return this.request(`/api/broker/profile?user_id=${userId}`);
  }

  async getBrokerMargins(userId) {
    return this.request(`/broker/margins?user_id=${userId}`);
  }

  // ========================================
  // Auth Functions (Available Endpoints)
  // ========================================

  async testBrokerOAuth(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/broker/test-oauth?user_id=${userId}`);
  }

  async getBrokerAuthStatus(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/broker/status?user_id=${userId}`);
  }

  // ========================================
  // Portfolio Functions
  // ========================================

  async getPortfolioData(userId, options = {}) {
    const { configId = null, bypassCache = false } = options;
    const params = this.buildQueryParams({
      userId,
      configId,
      options: bypassCache ? { bypass_cache: 'true' } : {}
    });
    return this.request(`/api/broker/portfolio?${params.toString()}`);
  }

  async fetchLivePortfolio(userId, options = {}) {
    const { configId = null } = options;

    if (!userId && !configId) {
      console.warn('[railwayAPI] Skipping live portfolio fetch - missing identifiers', {
        userId,
        configId
      });
      return {
        success: false,
        status: 'no_connection',
        message: 'Missing broker identifiers',
        needsAuth: true
      };
    }

    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (configId) params.append('config_id', configId);

    return this.request(`/api/portfolio/fetch-live-simple?${params.toString()}`, {
      method: 'POST',
    });
  }

  // Legacy method for backward compatibility
  async getHoldings(userId) {
    return this.getPortfolioData(userId);
  }

  // Legacy method for backward compatibility
  async getPositions(userId) {
    return this.getPortfolioData(userId);
  }

  // ========================================
  // AI Functions
  // ========================================

  async getAIStrategies(userId) {
    // This endpoint doesn't exist yet, return empty array for now
    return { data: [] };
  }

  async generateAIStrategy(userId, data) {
    return this.request(`/api/ai/strategy?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAIAnalysis(userId, data) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/ai/analysis?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAISignals(userId) {
    return this.request(`/api/ai/signals?user_id=${userId}`);
  }

  async getAIInsightsCrowd(userId) {
    return this.request(`/api/ai/insights/crowd?user_id=${userId}`);
  }

  async getAIInsightsTrending(userId) {
    return this.request(`/api/ai/insights/trending?user_id=${userId}`);
  }

  async getCopilotAnalysis(userId, data) {
    return this.request(`/api/ai/copilot/analyze?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCopilotRecommendations(userId) {
    return this.request(`/api/ai/copilot/recommendations?user_id=${userId}`);
  }

  async getPerformanceAnalytics(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/ai/analytics/performance?user_id=${userId}`);
  }

  async getStrategyAnalytics(userId, strategyId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/ai/analytics/strategy/${strategyId}?user_id=${userId}`);
  }

  async getStrategyClustering(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/ai/clustering/strategies?user_id=${userId}`);
  }

  async submitAIFeedback(userId, data) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/ai/feedback/outcome?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFeedbackInsights(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/ai/feedback/insights?user_id=${userId}`);
  }

  async getAIStatus(userId) {
    return this.request(`/api/ai/status?user_id=${userId}`);
  }

  async getAISessions(userId) {
    return this.request(`/api/ai/sessions?user_id=${userId}`);
  }

  // ========================================
  // AI Preferences (BYOAI)
  // ========================================

  async getAIPreferences(userId) {
    return this.request(`/api/ai/preferences?user_id=${userId}`);
  }

  async updateAIPreferences(userId, preferences) {
    return this.request(`/api/ai/preferences?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  async validateAIKey(userId, provider, apiKey) {
    return this.request(`/api/ai/validate-key?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        provider: provider,
        api_key: apiKey,
      }),
    });
  }

  // ========================================
  // Health Check
  // ========================================

  async healthCheck() {
    return this.request('/health');
  }

  async getVersion() {
    return this.request('/version');
  }

  async getReadyz() {
    return this.request('/readyz');
  }

  async getAIHealth() {
    return this.request('/api/ai/status');
  }

  async getTradingStatus() {
    return this.request('/api/trading/status');
  }
}

// Export singleton instance
export const railwayAPI = new RailwayAPI();
export default railwayAPI;
