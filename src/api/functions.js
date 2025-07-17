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

// CRITICAL FIX: Enhanced portfolioAPI that uses proper user identification
export const portfolioAPI = async (userInput) => {
  try {
    // First priority: Use authenticated broker user_id if available
    const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    const activeConfig = configs.find(config => config.is_connected && config.access_token);
    
    // Check if we have valid broker authentication
    if (!activeConfig || !activeConfig.access_token || !activeConfig.api_key) {
      console.warn("⚠️ [portfolioAPI] No active broker authentication found - returning empty portfolio data");
      // Return empty portfolio data instead of throwing error
      return {
        status: 'no_connection',
        message: 'No active broker connection',
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
    
    let userId;
    
    if (activeConfig?.user_data?.user_id) {
      userId = activeConfig.user_data.user_id;
      console.log("🔍 [portfolioAPI] Using authenticated broker user_id:", userId);
    } else {
      // Fallback: Extract from provided input
      userId = extractUserId(userInput);
      console.log("🔍 [portfolioAPI] No broker user_id found, using fallback:", userId);
    }
    
    console.log("🔍 [portfolioAPI] Final user_id:", userId, "Type:", typeof userId);
    console.log("🔍 [portfolioAPI] Active broker config:", {
      broker_name: activeConfig.broker_name,
      user_id: activeConfig.user_data?.user_id,
      has_access_token: !!activeConfig.access_token,
      has_api_key: !!activeConfig.api_key
    });
    
    return await railwayAPI.getPortfolioData(userId);
  } catch (error) {
    console.error("❌ [portfolioAPI] Error:", error);
    // Return empty data instead of throwing error to prevent dashboard crashes
    return {
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
      }
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
