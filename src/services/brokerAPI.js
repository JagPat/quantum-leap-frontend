// Centralized Broker API Service
// Handles all backend communication for broker authentication and operations

import { config } from '../config/deployment.js';

class BrokerAPIService {
    constructor() {
        this.baseURL = config.urls.backend;
        this.endpoints = config.api.auth;
    }

    // Setup OAuth credentials and get OAuth URL
    async setupOAuth(apiKey, apiSecret) {
        const params = new URLSearchParams({
            api_key: apiKey,
            api_secret: apiSecret,
            frontend_url: config.urls.frontend // Tell backend where to redirect
        });

        const response = await fetch(`${this.endpoints.testOAuth}?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Backend setup failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'OAuth setup failed');
        }

        return result;
    }

    // Generate session from request token
    async generateSession(requestToken, apiKey, apiSecret) {
        const response = await fetch(this.endpoints.generateSession, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                request_token: requestToken,
                api_key: apiKey,
                api_secret: apiSecret
            })
        });

        if (!response.ok) {
            throw new Error(`Session generation failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'Session generation failed');
        }

        return result;
    }

    // Get session data by user ID
    async getSession(userId) {
        const response = await fetch(`${this.endpoints.getSession}?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch session: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'Failed to fetch session');
        }

        return result;
    }

    // Check broker connection status
    async checkStatus(userId) {
        const response = await fetch(`${this.endpoints.checkStatus}?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'Status check failed');
        }

        return result;
    }

    // Invalidate session
    async invalidateSession(userId) {
        const response = await fetch(`${this.endpoints.invalidateSession}?user_id=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Session invalidation failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'Session invalidation failed');
        }

        return result;
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(config.api.health);
            return response.ok;
        } catch (error) {
            console.warn('Backend health check failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const brokerAPI = new BrokerAPIService();
export default brokerAPI; 