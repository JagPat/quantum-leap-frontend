// Railway Backend API Service
// Direct API calls to Railway backend for optimal performance

// const BACKEND_URL = 'http://127.0.0.1:8000'; // Local development
const BACKEND_URL = 'https://web-production-de0bc.up.railway.app'; // Production

class RailwayAPI {
  constructor() {
    this.baseURL = BACKEND_URL;
  }

  // Get authentication headers for Kite Connect API calls
  getAuthHeaders() {
    try {
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected && config.access_token);
      
      if (activeConfig && activeConfig.api_key && activeConfig.access_token) {
        return {
          'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,
          'X-User-ID': activeConfig.user_data?.user_id || 'unknown'
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
    
    // Define which endpoints require authentication
    const requiresAuth = endpoint.includes('/api/portfolio/') || 
                         endpoint.includes('/api/broker/') ||
                         endpoint.includes('/api/trading/') ||
                         endpoint.includes('/api/ai/') ||
                         endpoint.includes('/broker/') ||
                         endpoint.includes('/ai/');
    
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

    try {
      console.log(`🚀 [RailwayAPI] ${config.method} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn(`⚠️ [RailwayAPI] Unauthorized (401) for ${endpoint} - user needs to connect broker`);
          return {
            status: 'unauthorized',
            message: 'Please connect to your broker to access this feature.',
            data: null,
            requiresAuth: true
          };
        }
        
        if (response.status === 404) {
          console.warn(`⚠️ [RailwayAPI] Endpoint not found (404) for ${endpoint} - feature not yet implemented`);
          return {
            status: 'not_implemented',
            message: 'This feature is planned but not yet implemented.',
            data: null,
            endpoint: endpoint
          };
        }
        
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`✅ [RailwayAPI] Success:`, data);
      return data;
    } catch (error) {
      console.error(`❌ [RailwayAPI] Error:`, error);
      throw error;
    }
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

  async getBrokerHoldings(userId) {
    return this.request(`/api/broker/holdings?user_id=${userId}`);
  }

  async getBrokerPositions(userId) {
    return this.request(`/api/broker/positions?user_id=${userId}`);
  }

  async getBrokerProfile(userId) {
    return this.request(`/api/broker/profile?user_id=${userId}`);
  }

  async getBrokerMargins(userId) {
    return this.request(`/api/broker/margins?user_id=${userId}`);
  }

  // ========================================
  // Missing Broker Endpoints (Frontend Expected)
  // ========================================

  async getBrokerOrders(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/broker/orders?user_id=${userId}`);
  }

  // ========================================
  // Auth Functions (Available Endpoints)
  // ========================================

  async testBrokerOAuth(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/auth/broker/test-oauth?user_id=${userId}`);
  }

  async getBrokerAuthStatus(userId) {
    // This endpoint is not yet implemented - returns not_implemented status
    return this.request(`/api/auth/broker/status?user_id=${userId}`);
  }

  // ========================================
  // Portfolio Functions
  // ========================================

  async getPortfolioData(userId) {
    return this.request(`/api/portfolio/latest?user_id=${userId}`);
  }

  async fetchLivePortfolio(userId) {
    return this.request(`/api/portfolio/fetch-live?user_id=${userId}`, {
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
