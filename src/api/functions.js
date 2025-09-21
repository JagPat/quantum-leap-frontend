// Import Railway API instance
import { railwayAPI } from './railwayAPI';

// Helper function to extract user ID as string from various input types
const extractUserId = (userInput) => {
  if (!userInput) {
    console.warn("⚠️ No user input provided, using development fallback");
    return 'local@development.com';
  }
  
  // If it's already a string, return it
  if (typeof userInput === 'string') {
    return userInput;
  }
  
  // If it's an object, try to extract user ID
  if (typeof userInput === 'object') {
    // Try common user ID fields
    const userId = userInput.user_id || userInput.id || userInput.email || userInput.username;
    if (userId && typeof userId === 'string') {
      console.log("🔍 [extractUserId] Extracted from object:", userId);
      return userId;
    }
    
    console.error("❌ [extractUserId] Could not extract user ID from object:", userInput);
    console.error("❌ Available fields:", Object.keys(userInput));
    return 'local@development.com'; // Fallback
  }
  
  console.error("❌ [extractUserId] Unexpected user input type:", typeof userInput, userInput);
  return 'local@development.com'; // Fallback
};

const getActiveBrokerContext = () => {
  try {
    const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    const activeConfig = configs.find(config => config.is_connected && (config.access_token || config.accessToken));

    if (!activeConfig) {
      return null;
    }

    const userId = activeConfig.user_data?.user_id || activeConfig.user_id;
    return {
      activeConfig,
      userId
    };
  } catch (error) {
    console.error('❌ [getActiveBrokerContext] Failed to read broker configs:', error);
    return null;
  }
};

// CRITICAL FIX: Enhanced portfolioAPI that uses proper user identification
export const portfolioAPI = async (userInput, options = {}) => {
  try {
    // First priority: Use authenticated broker user_id if available
    const context = getActiveBrokerContext();

    // Check if we have valid broker authentication
    if (!context || !context.activeConfig.access_token || !context.activeConfig.api_key) {
      console.warn("⚠️ [portfolioAPI] No active broker authentication found - returning empty portfolio data");
      // Return empty portfolio data instead of throwing error
      return {
        success: false,
        status: 'no_connection',
        message: 'No active broker connection. Please connect to Zerodha to view live data.',
        needsAuth: true,
        data: {
          summary: {
            total_value: 0,
            day_pnl: 0,
            total_pnl: 0,
            holdings_value: 0,
            positions_value: 0
          },
          holdings: [],
          positions: []
        }
      };
    }
    
    const userId = context.userId || extractUserId(userInput);

    console.log("🔍 [portfolioAPI] Using authenticated broker user_id:", userId);
    
    console.log("🔍 [portfolioAPI] Final user_id:", userId, "Type:", typeof userId);
    console.log("🔍 [portfolioAPI] Active broker config:", {
      broker_name: context.activeConfig.broker_name,
      user_id: context.activeConfig.user_data?.user_id,
      has_access_token: !!context.activeConfig.access_token,
      has_api_key: !!context.activeConfig.api_key
    });
    
    return await railwayAPI.getPortfolioData(userId, options);
  } catch (error) {
    console.error("❌ [portfolioAPI] Error:", error);
    // Return empty data instead of throwing error to prevent dashboard crashes
    return {
      success: false,
      status: 'error',
      message: error.message,
      data: {
        summary: {
          total_value: 0,
          day_pnl: 0,
          total_pnl: 0,
          holdings_value: 0,
          positions_value: 0
        },
        holdings: [],
        positions: []
      },
      needsAuth: error.code === 'TOKEN_EXPIRED' || error.code === 'BROKER_UNAUTHORIZED'
    };
  }
};

// Export functions with Base44-compatible names for backward compatibility
export const helloWorld = railwayAPI.healthCheck;
export const manualAuthCheck = railwayAPI.checkConnectionStatus;
export const brokerConnection = railwayAPI.generateSession;
export const debugJWT = railwayAPI.checkConnectionStatus;
export const brokerDisconnect = railwayAPI.invalidateSession;

// Create a proper brokerAPI function that handles multiple endpoints
export const brokerAPI = async ({ endpoint, user_id }) => {
  // Enhanced user ID extraction
  let userId = extractUserId(user_id);
  
  // If still no user_id, try to get from localStorage as fallback
  if (!userId || userId === 'local@development.com') {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{"email": "local@development.com"}');
    const fallbackUserId = extractUserId(user);
    if (fallbackUserId !== 'local@development.com') {
      userId = fallbackUserId;
    }
  }
  
  console.log("🔍 [brokerAPI] Using user_id:", userId, "for endpoint:", endpoint);
  
  switch (endpoint) {
    case 'holdings':
      return { data: await railwayAPI.getHoldings(userId) };
    case 'positions':
      return { data: await railwayAPI.getPositions(userId) };
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
};

export const fetchBrokerOrders = async ({ userInput, bypassCache = false } = {}) => {
  const context = getActiveBrokerContext();

  if (!context?.userId) {
    return {
      success: false,
      status: 'no_connection',
      message: 'No active broker connection. Please connect to Zerodha to view order history.',
      needsAuth: true,
      data: []
    };
  }

  const userId = context.userId || extractUserId(userInput);
  console.log('🔍 [fetchBrokerOrders] Fetching orders for user', userId, { bypassCache });

  const result = await railwayAPI.getBrokerOrders(userId, { bypassCache });
  return result;
};
