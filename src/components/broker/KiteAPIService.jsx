
// This service acts as a wrapper for making API calls to YOUR backend server,
// not directly to Zerodha. Your backend will handle the direct communication with Kite.
import { User } from '@/api/entities';

class KiteAPIService {
    constructor(apiKey, apiSecret, accessToken) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.accessToken = accessToken;
        this.backendUrl = 'https://web-production-de0bc.up.railway.app';
    }

    async #getAuthHeaders() {
        const user = await User.me();
        if (!user || !user.token) {
            throw new Error("User not authenticated");
        }
        
        const headers = {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
        };

        // As part of "Fix Broker API Authentication", include the broker-specific credentials
        // in the headers if they are provided to the service.
        // Your backend is expected to use these (along with the user's bearer token)
        // to authenticate and process the broker-related requests.
        // The header names (e.g., 'X-Kite-ApiKey') are examples and should match
        // what your backend expects.
        if (this.apiKey) {
            headers['X-Kite-ApiKey'] = this.apiKey;
        }
        if (this.apiSecret) {
            headers['X-Kite-ApiSecret'] = this.apiSecret;
        }
        if (this.accessToken) {
            headers['X-Kite-AccessToken'] = this.accessToken;
        }

        return headers;
    }

    async #makeRequest(endpoint, method = 'GET', body = null) {
        const headers = await this.#getAuthHeaders();
        const config = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.backendUrl}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from backend' }));
            throw new Error(errorData.message || `Backend request failed with status ${response.status}`);
        }

        return response.json();
    }

    // Fetches holdings from your backend's /api/broker/holdings endpoint
    getHoldings() {
        console.log("🚀 Calling YOUR backend for holdings...");
        return this.#makeRequest('/api/broker/holdings');
    }

    // Fetches positions from your backend's /api/broker/positions endpoint
    getPositions() {
        console.log("🚀 Calling YOUR backend for positions...");
        return this.#makeRequest('/api/broker/positions');
    }
    
    // Fetches user profile from your backend's /api/broker/profile endpoint
    getProfile() {
        console.log("🚀 Calling YOUR backend for user profile...");
        return this.#makeRequest('/api/broker/profile');
    }
}

export default KiteAPIService;
