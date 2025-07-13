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
    
    const requiresAuth = endpoint.includes('/api/portfolio/') || 
                         endpoint.includes('/api/broker/status-header') ||
                         endpoint.includes('/api/broker/invalidate-session');
    
    const authHeaders = requiresAuth ? this.getAuthHeaders() : {};
    
    if (requiresAuth && (!authHeaders.Authorization || !authHeaders['X-User-ID'])) {
      console.error(`❌ [RailwayAPI] Missing authorization for authenticated endpoint: ${endpoint}`);
      return { 
          status: 'error', 
          message: 'Missing authorization header. Please ensure you are connected to your broker.', 
          data: null 
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
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ [RailwayAPI] Success for ${endpoint}`);
      return { status: 'success', data };

    } catch (error) {
      console.error(`❌ [RailwayAPI] Error for ${endpoint}:`, error);
      return { status: 'error', message: error.message, data: null };
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
    return this.request(`/api/broker/invalidate-session?user_id=${userId}`, {
      method: 'POST',
    });
  }

  async checkConnectionStatus(userId) {
    return this.request(`/api/auth/broker/status?user_id=${userId}`);
  }

  // Portfolio Functions
  async fetchLivePortfolio() {
    return this.request('/api/portfolio/fetch-live', {
      method: 'POST',
    });
  }

  async getLatestPortfolio() {
    return this.request('/api/portfolio/latest');
  }

  async getPortfolioData(userId) {
    try {
        console.log("🚀 [getPortfolioData] Fetching full portfolio for user:", userId);

        const [holdingsResult, positionsResult] = await Promise.all([
            this.getHoldings(userId),
            this.getPositions(userId)
        ]);

        if (holdingsResult.status === 'error' || positionsResult.status === 'error') {
            throw new Error(holdingsResult.message || positionsResult.message || 'Failed to fetch portfolio components');
        }

        const holdings = Array.isArray(holdingsResult.data) ? holdingsResult.data : [];
        const positions = positionsResult.data && Array.isArray(positionsResult.data.net) ? positionsResult.data.net : [];
        
        const holdings_value = holdings.reduce((acc, h) => acc + (h.last_price * h.quantity), 0);
        const holdings_pnl = holdings.reduce((acc, h) => acc + h.pnl, 0);
        const day_pnl_holdings = holdings.reduce((acc, h) => acc + h.day_change, 0);

        const positions_value = positions.reduce((acc, p) => acc + (p.last_price * p.quantity), 0);
        const positions_pnl = positions.reduce((acc, p) => acc + p.pnl, 0);
        const day_pnl_positions = positions.reduce((acc, p) => acc + (p.day_change || 0), 0);

        const summary = {
            total_value: holdings_value + positions_value,
            total_pnl: holdings_pnl + positions_pnl,
            day_pnl: day_pnl_holdings + day_pnl_positions,
            holdings_value: holdings_value,
            positions_value: positions_value
        };

        const structuredData = { holdings, positions, summary };
        
        return { status: 'success', data: structuredData };

    } catch (error) {
        console.error("❌ [getPortfolioData] Error:", error);
        return { status: 'error', message: error.message, data: null };
    }
  }

  async getHoldings(userId) {
    return this.request(`/api/portfolio/holdings?user_id=${userId}`);
  }

  async getPositions(userId) {
    return this.request(`/api/portfolio/positions?user_id=${userId}`);
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const railwayAPIInstance = new RailwayAPI();

// Export individual functions that call the instance methods
export const generateSession = (requestToken, apiKey, apiSecret) => 
  railwayAPIInstance.generateSession(requestToken, apiKey, apiSecret);

export const invalidateSession = (userId) => 
  railwayAPIInstance.invalidateSession(userId);

export const checkConnectionStatus = (userId) => 
  railwayAPIInstance.checkConnectionStatus(userId);

export const getPortfolioData = (userId) => 
  railwayAPIInstance.getPortfolioData(userId);

export const getPositions = (userId) => 
  railwayAPIInstance.getPositions(userId);

export const getHoldings = (userId) => 
  railwayAPIInstance.getHoldings(userId);

export const fetchLivePortfolio = () =>
  railwayAPIInstance.fetchLivePortfolio();

export const getLatestPortfolio = () =>
  railwayAPIInstance.getLatestPortfolio();

export const healthCheck = () => 
  railwayAPIInstance.healthCheck();
