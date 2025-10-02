// Centralized Broker API Service
// Handles all backend communication for broker authentication and operations

import { config } from '../config/deployment.js';
import { brokerSessionStore, normalizeBrokerSession } from '../api/sessionStore.js';

class BrokerAPIService {
    constructor() {
        this.baseURL = config.urls.backend;
        this.endpoints = {
            ...config.api.auth,
            // OAuth endpoints - Backend routes are at /api/broker/* not /api/modules/auth/broker/*
            setupOAuth: `${this.baseURL}/api/broker/setup-oauth`,
            callback: `${this.baseURL}/api/broker/callback`,
            generateSession: `${this.baseURL}/api/broker/generate-session`,
            refreshToken: `${this.baseURL}/api/broker/refresh-token`,
            disconnect: `${this.baseURL}/api/broker/disconnect`,
            status: `${this.baseURL}/api/broker/status`,
            configs: `${this.baseURL}/api/broker/configs`,
            reconnect: `${this.baseURL}/api/broker/reconnect`,
            health: `${this.baseURL}/api/broker/health`
        };
        
    // OAuth flow management
    this.currentOAuthFlow = null;
    this.oauthWindow = null;
    this.oauthCheckInterval = null;
  }

  getActiveSession() {
    return brokerSessionStore.load();
  }

  persistSession(payload) {
    if (!payload) return null;
    return brokerSessionStore.persist(normalizeBrokerSession(payload));
  }

  clearSession() {
    brokerSessionStore.clear();
  }

    // Setup OAuth credentials and get OAuth URL
    async setupOAuth(apiKey, apiSecret, userId) {
        try {
            const response = await fetch(this.endpoints.setupOAuth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    api_secret: apiSecret,
                    user_id: userId,
                    frontend_url: config.urls.frontend
                })
            });

            let result;
            const isJson = (response.headers.get('content-type') || '').includes('application/json');
            if (isJson) {
                result = await response.json();
            } else {
                const text = await response.text();
                const fallbackMessage = text?.trim() || response.statusText || 'Unexpected response from OAuth setup endpoint';
                const nonJsonError = new Error(`OAuth setup failed: ${fallbackMessage}`);
                nonJsonError.status = response.status;
                nonJsonError.data = { raw: text };
                throw nonJsonError;
            }

            if (!response.ok || !result?.success) {
                const messageParts = [];

                if (result?.error) {
                    messageParts.push(result.error);
                }

                if (result?.message && !messageParts.includes(result.message)) {
                    messageParts.push(result.message);
                }

                if (typeof result?.details === 'string' && !messageParts.includes(result.details)) {
                    messageParts.push(result.details);
                }

                if (!messageParts.length) {
                    messageParts.push('OAuth setup failed');
                }

                const error = new Error(messageParts.join(': '));
                error.status = response.status;
                if (result?.code) {
                    error.code = result.code;
                }
                error.data = result;
                throw error;
            }

            const responseData = result.data || {};

            // Normalize identifier fields since backend responses may change casing/shape
            const normalizedConfigId = responseData.config_id
                || responseData.configId
                || responseData.configuration_id
                || responseData.configurationId
                || responseData.id
                || result.config_id
                || result.configId
                || result.id
                || null;

            const normalizedUserId = responseData.user_id
                || responseData.userId
                || responseData.userID
                || result.user_id
                || result.userId
                || result.userID
                || null;

            const normalizedState = responseData.state
                || responseData.oauth_state
                || result.state
                || result.oauth_state;

            const normalizedOauthUrl = responseData.oauth_url
                || responseData.oauthUrl
                || responseData.authorization_url
                || result.oauth_url
                || result.oauthUrl
                || result.authorization_url;

            const normalizedRedirectUri = responseData.redirect_uri
                || responseData.redirectUri
                || result.redirect_uri
                || result.redirectUri;

            const normalized = {
                ...responseData,
                config_id: normalizedConfigId,
                configId: normalizedConfigId,
                user_id: normalizedUserId,
                userId: normalizedUserId,
                state: normalizedState,
                oauth_state: normalizedState,
                oauth_url: normalizedOauthUrl,
                oauthUrl: normalizedOauthUrl,
                redirect_uri: normalizedRedirectUri,
                redirectUri: normalizedRedirectUri
            };

            if (!normalized.config_id || !normalized.user_id) {
                console.warn('[BrokerAPI] OAuth setup response missing identifiers', {
                    configId: normalized.config_id,
                    userId: normalized.user_id,
                    raw: result
                });
            }

            // Store OAuth flow data
            this.currentOAuthFlow = {
                configId: normalized.config_id,
                state: normalized.state,
                oauthUrl: normalized.oauth_url,
                redirectUri: normalized.redirect_uri
            };

            return normalized;
        } catch (error) {
            console.error('OAuth setup error:', error);
            throw error;
        }
    }

    // Handle OAuth callback
    async handleOAuthCallback(requestToken, state) {
        try {
            if (!this.currentOAuthFlow) {
                throw new Error('No active OAuth flow found');
            }

            const response = await fetch(this.endpoints.callback, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    request_token: requestToken,
                    state: state,
                    config_id: this.currentOAuthFlow.configId
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || result.message || 'OAuth callback failed');
            }

            // Clear OAuth flow
            this.currentOAuthFlow = null;

            return result.data;
        } catch (error) {
            console.error('OAuth callback error:', error);
            this.currentOAuthFlow = null;
            throw error;
        }
    }

    // Get broker configurations
    async getBrokerConfigs(userId) {
        try {
            const response = await fetch(`${this.endpoints.configs}?user_id=${userId}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch broker configurations');
            }

            return result.data;
        } catch (error) {
            console.error('Get broker configs error:', error);
            throw error;
        }
    }

    // Create or update broker configuration
    async createBrokerConfig(userId, apiKey, apiSecret, brokerName = 'zerodha') {
        try {
            const response = await fetch(this.endpoints.configs, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    api_key: apiKey,
                    api_secret: apiSecret,
                    broker_name: brokerName
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create broker configuration');
            }

            return result.data;
        } catch (error) {
            console.error('Create broker config error:', error);
            throw error;
        }
    }

    // Generate broker session by exchanging request token
    async generateSession(requestToken, apiKey, apiSecret, options = {}) {
        try {
            const payload = {
                request_token: requestToken,
                api_key: apiKey,
                api_secret: apiSecret
            };

            if (options.userId) {
                payload.user_id = options.userId;
            }

            if (options.configId) {
                payload.config_id = options.configId;
            }

            const response = await fetch(this.endpoints.generateSession, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(result.error || result.message || 'Failed to generate broker session');
            }

            const data = result.data || {};
            this.persistSession({
                config_id: data.config_id,
                user_id: data.user_id,
                broker_name: data.broker_name || 'zerodha',
                connection_status: data.connection_status,
                session_status: 'connected',
                needs_reauth: false
            });

            return {
                status: 'success',
                ...data
            };
        } catch (error) {
            console.error('Generate session error:', error);
            throw error;
        }
    }

    // Check connection status
  async checkConnectionStatus(configId = null, userId = null) {
        try {
            const params = new URLSearchParams();
            const session = this.getActiveSession();
            const effectiveConfigId = configId || session?.configId || null;
            const effectiveUserId = userId || session?.userId || null;

            if (!effectiveConfigId && !effectiveUserId) {
                console.warn('[BrokerAPI] Refusing to call status without identifiers', {
                    requestedConfigId: configId,
                    requestedUserId: userId,
                    storedSession: session
                });
                return null;
            }

            if (effectiveConfigId && !params.has('config_id')) params.append('config_id', effectiveConfigId);
            if (effectiveUserId && !params.has('user_id')) params.append('user_id', effectiveUserId);

            const queryString = params.toString();
            if (typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'production') {
                console.debug('[BrokerAPI] Checking broker status', {
                    configId: effectiveConfigId,
                    userId: effectiveUserId,
                    query: queryString
                });
            }

            const response = await fetch(`${this.endpoints.status}?${queryString}`);
            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.success === false) {
                const message = result.error || result.message;
                if (response.status === 400 && message && message.toLowerCase().includes('either config_id or user_id is required')) {
                    console.warn('[BrokerAPI] Backend rejected status check due to missing identifiers', {
                        configId: effectiveConfigId,
                        userId: effectiveUserId,
                        response: result
                    });
                    return null;
                }
                if (response.status === 401 || response.status === 403 || result?.needs_reauth) {
                    this.clearSession();
                    brokerSessionStore.markNeedsReauth();
                    throw new Error(result.error || 'Broker session requires reauthentication');
                }
                throw new Error(message || 'Status check failed');
            }

            this.persistSession(result.data);

            return result.data;
        } catch (error) {
            console.error('Status check error:', error);
            throw error;
        }
    }

    // Refresh OAuth tokens
    async refreshTokens(configId) {
        try {
            const response = await fetch(this.endpoints.refreshToken, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    config_id: configId
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || result.message || 'Token refresh failed');
            }

            if (result.success && result.data) {
                this.persistSession(result.data);
            }

            return result;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    // Disconnect broker
    async disconnectBroker(configId) {
        try {
            const response = await fetch(this.endpoints.disconnect, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    config_id: configId
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || result.message || 'Disconnect failed');
            }

            if (result.success) {
                this.clearSession();
            }

            return result;
        } catch (error) {
            console.error('Disconnect error:', error);
            throw error;
        }
    }

    // Reconnect broker
    async reconnectBroker(configId) {
        try {
            const response = await fetch(this.endpoints.reconnect, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    config_id: configId
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || result.message || 'Reconnect failed');
            }

            return result;
        } catch (error) {
            console.error('Reconnect error:', error);
            throw error;
        }
    }

    // Delete broker configuration
    async deleteBrokerConfig(configId, userId) {
        try {
            const response = await fetch(`${this.endpoints.configs}/${configId}?user_id=${userId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Delete failed');
            }

            return result;
        } catch (error) {
            console.error('Delete config error:', error);
            throw error;
        }
    }

    // OAuth flow management
    async initiateOAuthFlow(oauthUrl, onSuccess, onError, onCancel) {
        try {
            // Close any existing OAuth window
            this.closeOAuthWindow();

            // Open OAuth window
            const windowFeatures = 'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes';
            this.oauthWindow = window.open(oauthUrl, 'oauth_window', windowFeatures);

            if (!this.oauthWindow) {
                throw new Error('Failed to open OAuth window. Please allow popups for this site.');
            }

            // Monitor OAuth window
            this.monitorOAuthWindow(onSuccess, onError, onCancel);

        } catch (error) {
            console.error('OAuth flow initiation error:', error);
            if (onError) onError(error);
        }
    }

    monitorOAuthWindow(onSuccess, onError, onCancel) {
        // Check if window is closed every second
        this.oauthCheckInterval = setInterval(() => {
            if (this.oauthWindow && this.oauthWindow.closed) {
                this.cleanupOAuthFlow();
                if (onCancel) onCancel();
                return;
            }

            // Try to access window URL (will fail due to CORS until redirect)
            try {
                if (this.oauthWindow && this.oauthWindow.location.href.includes(config.urls.frontend)) {
                    // OAuth completed, extract parameters
                    const url = new URL(this.oauthWindow.location.href);
                    const requestToken = url.searchParams.get('request_token');
                    const state = url.searchParams.get('state');
                    const status = url.searchParams.get('status');

                    this.closeOAuthWindow();

                    if (status === 'success' && requestToken && state) {
                        // Handle successful OAuth
                        this.handleOAuthCallback(requestToken, state)
                            .then(result => {
                                if (onSuccess) onSuccess(result);
                            })
                            .catch(error => {
                                if (onError) onError(error);
                            });
                    } else {
                        const error = new Error(url.searchParams.get('error') || 'OAuth authorization failed');
                        if (onError) onError(error);
                    }
                }
            } catch (e) {
                // Expected CORS error while OAuth is in progress
            }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
            if (this.oauthWindow && !this.oauthWindow.closed) {
                this.closeOAuthWindow();
                if (onError) onError(new Error('OAuth flow timed out'));
            }
        }, 5 * 60 * 1000);
    }

    closeOAuthWindow() {
        if (this.oauthWindow) {
            this.oauthWindow.close();
            this.oauthWindow = null;
        }
        this.cleanupOAuthFlow();
    }

    cleanupOAuthFlow() {
        if (this.oauthCheckInterval) {
            clearInterval(this.oauthCheckInterval);
            this.oauthCheckInterval = null;
        }
    }

    // Get current OAuth flow
    getCurrentOAuthFlow() {
        return this.currentOAuthFlow;
    }

    // Clear OAuth flow
    clearOAuthFlow() {
        this.currentOAuthFlow = null;
        this.closeOAuthWindow();
    }

    // Auto-refresh tokens for active connections
    async startAutoTokenRefresh(configs, onRefresh) {
        // Check every 30 minutes
        setInterval(async () => {
            for (const config of configs) {
                if (config.isConnected && config.tokenStatus?.status === 'expiring_soon') {
                    try {
                        console.log(`Auto-refreshing tokens for config ${config.id}`);
                        await this.refreshTokens(config.id);
                        if (onRefresh) onRefresh(config.id);
                    } catch (error) {
                        console.error(`Auto token refresh failed for config ${config.id}:`, error);
                    }
                }
            }
        }, 30 * 60 * 1000);
    }

    // Connection status polling
    async startStatusPolling(configId, interval = 60000, onStatusUpdate) {
        const pollStatus = async () => {
            try {
                const status = await this.checkConnectionStatus(configId);
                if (onStatusUpdate) onStatusUpdate(status);
            } catch (error) {
                console.error('Status polling error:', error);
            }
        };

        // Initial check
        await pollStatus();

        // Set up interval
        return setInterval(pollStatus, interval);
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(this.endpoints.health);
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.warn('Broker API health check failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const brokerAPI = new BrokerAPIService();
export default brokerAPI; 
