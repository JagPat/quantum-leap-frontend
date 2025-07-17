// DEPLOYMENT-READY: Centralized configuration for all environments
// This file automatically detects the environment and provides appropriate settings

const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
const isProduction = !isDevelopment;

// Backend API configuration
const getBackendUrl = () => {
  // In production, use the deployed backend URL
  if (isProduction) {
    return 'https://web-production-de0bc.up.railway.app';
  }
  
  // In development, check for local backend first, fallback to Railway
  const localBackend = 'http://localhost:8000';
  const railwayBackend = 'https://web-production-de0bc.up.railway.app';
  
  // You can add logic here to test local backend availability
  // For now, default to Railway backend for consistency
  return railwayBackend;
};

// Frontend URL configuration
const getFrontendUrl = () => {
  return window.location.origin;
};

// OAuth callback configuration
const getCallbackUrl = () => {
  return `${getFrontendUrl()}/broker-callback`;
};

// Broker configuration
const getBrokerConfig = () => {
  return {
    zerodha: {
      name: 'Zerodha Kite Connect',
      loginUrl: 'https://kite.zerodha.com/connect/login',
      docsUrl: 'https://kite.trade/docs/connect/v3/',
      description: 'Connect your Zerodha account to enable automated trading'
    }
  };
};

// API endpoints
const getApiEndpoints = () => {
  const baseUrl = getBackendUrl();
  return {
    auth: {
      testOAuth: `${baseUrl}/broker/test-oauth`,
      generateSession: `${baseUrl}/broker/generate-session`,
      invalidateSession: `${baseUrl}/broker/invalidate-session`,
      checkStatus: `${baseUrl}/broker/status`,
      getSession: `${baseUrl}/broker/session`,
      callback: `${baseUrl}/broker/callback`
    },
    broker: {
      holdings: `${baseUrl}/portfolio/holdings`,
      positions: `${baseUrl}/portfolio/positions`,
      profile: `${baseUrl}/broker/profile`,
      margins: `${baseUrl}/broker/margins`
    },
    portfolio: {
      data: `${baseUrl}/api/portfolio/data`,
      live: `${baseUrl}/api/portfolio/live`,
      latest: `${baseUrl}/api/portfolio/latest`
    },
    health: `${baseUrl}/api/health`
  };
};

// Cross-origin messaging configuration
const getMessagingConfig = () => {
  return {
    // Allowed origins for postMessage (automatically includes current origin)
    allowedOrigins: [
      getFrontendUrl(),
      getBackendUrl(),
      // Add any additional trusted origins here
    ],
    // Timeout for popup operations
    popupTimeout: 300000, // 5 minutes
    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000
  };
};

// Logging configuration
const getLoggingConfig = () => {
  return {
    level: isDevelopment ? 'debug' : 'info',
    enableConsole: isDevelopment,
    enableRemote: isProduction
  };
};

// Export configuration object
export const config = {
  environment: {
    isDevelopment,
    isProduction,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  urls: {
    backend: getBackendUrl(),
    frontend: getFrontendUrl(),
    callback: getCallbackUrl()
  },
  api: getApiEndpoints(),
  broker: getBrokerConfig(),
  messaging: getMessagingConfig(),
  logging: getLoggingConfig()
};

// Helper functions for common operations
export const helpers = {
  // Check if current environment is development
  isDev: () => isDevelopment,
  
  // Check if current environment is production
  isProd: () => isProduction,
  
  // Get appropriate API URL for any endpoint
  getApiUrl: (endpoint) => {
    const endpoints = getApiEndpoints();
    return endpoints[endpoint] || `${getBackendUrl()}${endpoint}`;
  },
  
  // Format URL with parameters
  formatUrl: (baseUrl, params = {}) => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  },
  
  // Get CORS-safe origin for postMessage
  getSafeOrigin: (targetWindow = null) => {
    try {
      if (targetWindow && targetWindow.location) {
        return targetWindow.location.origin;
      }
    } catch (e) {
      // Cross-origin restriction
    }
    
    // Fallback to current origin
    return window.location.origin;
  }
};

export default config; 