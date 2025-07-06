// Production Kite Connect API Service
// This service handles real API calls through a backend proxy to avoid CORS issues

class KiteAPIService {
  constructor(apiKey, apiSecret, accessToken = null) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.accessToken = accessToken;
    this.baseURL = '/api/broker'; // Backend API endpoint
  }

  // Make authenticated requests to our backend
  async _makeRequest(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          api_secret: this.apiSecret,
          access_token: this.accessToken,
          ...data
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Exchange request token for access token (via backend)
  async generateAccessToken(requestToken, redirectUrl) {
    try {
      const response = await this._makeRequest('/generate-session', {
        request_token: requestToken,
        redirect_url: redirectUrl
      });

      if (response.status === 'success' && response.data.access_token) {
        this.accessToken = response.data.access_token;
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to generate access token');
      }
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  // Test connection by fetching user profile
  async testConnection(accessToken = null) {
    if (accessToken) this.accessToken = accessToken;
    
    try {
      const response = await this._makeRequest('/profile');
      
      if (response.status === 'success') {
        return {
          status: 'success',
          user_id: response.data.user_id,
          user_name: response.data.user_name,
          email: response.data.email,
          available_cash: response.data.equity?.available?.cash || 0,
          broker: 'ZERODHA'
        };
      } else {
        throw new Error(response.message || 'Connection test failed');
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  // Fetch real holdings from Kite API
  async getHoldings() {
    try {
      const response = await this._makeRequest('/holdings');
      
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data
        };
      } else {
        throw new Error(response.message || 'Failed to fetch holdings');
      }
    } catch (error) {
      throw new Error(`Holdings fetch failed: ${error.message}`);
    }
  }

  // Fetch real positions from Kite API
  async getPositions() {
    try {
      const response = await this._makeRequest('/positions');
      
      if (response.status === 'success') {
        return {
          status: 'success',
          data: response.data
        };
      } else {
        throw new Error(response.message || 'Failed to fetch positions');
      }
    } catch (error) {
      throw new Error(`Positions fetch failed: ${error.message}`);
    }
  }

  // Get account margins
  async getMargins() {
    try {
      const response = await this._makeRequest('/margins');
      return response;
    } catch (error) {
      throw new Error(`Margins fetch failed: ${error.message}`);
    }
  }

  // Place order (for future use)
  async placeOrder(orderData) {
    try {
      const response = await this._makeRequest('/place-order', orderData);
      return response;
    } catch (error) {
      throw new Error(`Order placement failed: ${error.message}`);
    }
  }
}

export default KiteAPIService;