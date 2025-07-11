// Railway Backend API Service
// Replaces Base44 SDK with direct API calls to our Railway backend

const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';

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
        // Follow Kite Connect v3 documentation: Authorization: token api_key:access_token
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
    
    // Determine if this endpoint needs authentication
    const requiresAuth = endpoint.includes('/api/portfolio/') || 
                        endpoint.includes('/api/auth/broker/status') ||
                        endpoint.includes('/api/auth/broker/invalidate');
    
    const authHeaders = requiresAuth ? this.getAuthHeaders() : {};
    
    // Check if we have required auth headers for authenticated endpoints
    if (requiresAuth && (!authHeaders.Authorization || !authHeaders['X-User-ID'])) {
      console.error('❌ [RailwayAPI] Missing authorization header for authenticated endpoint');
      throw new Error('Missing authorization header');
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🚀 [RailwayAPI] ${config.method || 'GET'} ${url}`);
      if (requiresAuth) {
        console.log(`🔐 [RailwayAPI] Auth headers:`, Object.keys(authHeaders));
      }
      
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ [RailwayAPI] Success:`, data);
      return data;
    } catch (error) {
      console.error(`❌ [RailwayAPI] Error:`, error);
      throw error;
    }
  }

  // Broker Authentication Functions
  async generateSession(requestToken, apiKey, apiSecret) {
    return this.request('/api/auth/broker/generate-session', {
      method: 'POST',
      body: JSON.stringify({
        request_token: requestToken,
        api_key: apiKey,
        api_secret: apiSecret,
      }),
    });
  }

  async invalidateSession(userId) {
    return this.request(`/api/auth/broker/invalidate-session?user_id=${userId}`, {
      method: 'POST',
    });
  }

  async checkConnectionStatus(userId) {
    return this.request(`/api/auth/broker/status-header`);
  }

  // Portfolio Functions
  async getPortfolioData(userId) {
    return this.request(`/api/portfolio/data?user_id=${userId}`);
  }

  async getHoldings(userId) {
    return this.request(`/api/portfolio/holdings?user_id=${userId}`);
  }

  // Trading Functions
  async getPositions(userId) {
    return this.request(`/api/portfolio/positions?user_id=${userId}`);
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
export const railwayAPI = new RailwayAPI();

// Export individual functions for backward compatibility
export const generateSession = (requestToken, apiKey, apiSecret) => 
  railwayAPI.generateSession(requestToken, apiKey, apiSecret);

export const invalidateSession = (userId) => 
  railwayAPI.invalidateSession(userId);

export const checkConnectionStatus = (userId) => 
  railwayAPI.checkConnectionStatus(userId);

export const getPortfolioData = (userId) => 
  railwayAPI.getPortfolioData(userId);

export const getPositions = (userId) => 
  railwayAPI.getPositions(userId);

export const getHoldings = (userId) => 
  railwayAPI.getHoldings(userId);

export const healthCheck = () => 
  railwayAPI.healthCheck();
