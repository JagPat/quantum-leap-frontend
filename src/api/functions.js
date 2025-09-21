import { railwayAPI } from './railwayAPI';
import { brokerSessionStore, normalizeBrokerSession } from './sessionStore';

const LEGACY_CONFIGS_KEY = 'brokerConfigs';

const extractUserId = (userInput) => {
  if (!userInput) {
    console.warn('⚠️ [extractUserId] No user input provided');
    return 'local@development.com';
  }

  if (typeof userInput === 'string') {
    return userInput;
  }

  if (typeof userInput === 'object') {
    const userId = userInput.user_id || userInput.id || userInput.email || userInput.username;
    if (userId && typeof userId === 'string') {
      return userId;
    }

    console.error('❌ [extractUserId] Could not extract user ID from object', userInput);
    return 'local@development.com';
  }

  console.error('❌ [extractUserId] Unexpected user input type:', typeof userInput, userInput);
  return 'local@development.com';
};

const hydrateSessionFromLegacy = () => {
  try {
    const configs = JSON.parse(localStorage.getItem(LEGACY_CONFIGS_KEY) || '[]');
    const activeConfig = configs.find(config => config.is_connected && config.config_id);
    if (!activeConfig) return null;

    return brokerSessionStore.persist({
      config_id: activeConfig.config_id,
      user_id: activeConfig.user_id,
      broker_name: activeConfig.broker_name,
      connection_status: activeConfig.connection_status,
      session_status: activeConfig.session_status || (activeConfig.is_connected ? 'connected' : 'disconnected'),
      needs_reauth: activeConfig.needs_reauth
    });
  } catch (error) {
    console.error('❌ [hydrateSessionFromLegacy] Failed to parse legacy configs', error);
    return null;
  }
};

const getActiveBrokerContext = () => {
  let session = brokerSessionStore.load();
  if (!session) {
    session = hydrateSessionFromLegacy();
  }

  if (!session) {
    return null;
  }

  return {
    session,
    userId: session.userId,
    configId: session.configId
  };
};

const handleSessionFromResponse = (payload) => {
  if (!payload) return null;
  const normalized = normalizeBrokerSession(payload);
  if (normalized) {
    return brokerSessionStore.persist(normalized);
  }
  return null;
};

const markSessionNeedsAuth = () => {
  brokerSessionStore.markNeedsReauth();
};

const shouldTreatAsAuthError = (error) => {
  if (!error) return false;
  const status = error.status;
  const code = error.code;
  if (status === 401 || status === 403) return true;
  if (code && ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'BROKER_UNAUTHORIZED', 'TOKEN_ERROR'].includes(code)) return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('token') && (message.includes('expire') || message.includes('invalid'));
};

export const portfolioAPI = async (userInput, { bypassCache = false } = {}) => {
  try {
    const context = getActiveBrokerContext();

    if (!context || !context.session || context.session.needsReauth) {
      return {
        success: false,
        status: 'no_connection',
        message: 'Broker session requires reconnection.',
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
    const response = await railwayAPI.getPortfolioData(userId, {
      configId: context.configId,
      bypassCache
    });

    if (response?.success === false) {
      const needsAuth = Boolean(
        response.needsAuth ||
        response.needs_reauth ||
        (response.code && ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'BROKER_UNAUTHORIZED', 'TOKEN_ERROR'].includes(response.code))
      );

      if (needsAuth) {
        markSessionNeedsAuth();
      }

      return {
        ...response,
        needsAuth
      };
    }

    const updatedSession = handleSessionFromResponse(response?.data?.session);

    return {
      ...response,
      needsAuth: Boolean(updatedSession?.needsReauth)
    };
  } catch (error) {
    console.error('❌ [portfolioAPI] Error:', error);
    const needsAuth = shouldTreatAsAuthError(error);
    if (needsAuth) {
      markSessionNeedsAuth();
    }
    return {
      success: false,
      status: 'error',
      message: error.message,
      needsAuth,
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

export const helloWorld = railwayAPI.healthCheck;
export const manualAuthCheck = railwayAPI.checkConnectionStatus;
export const brokerConnection = railwayAPI.generateSession;
export const debugJWT = railwayAPI.checkConnectionStatus;
export const brokerDisconnect = railwayAPI.invalidateSession;

export const brokerAPI = async ({ endpoint, user_id }) => {
  const context = getActiveBrokerContext();
  const session = context?.session;

  let userId = context?.userId || extractUserId(user_id);
  const configId = context?.configId || session?.configId || null;

  switch (endpoint) {
    case 'holdings':
      return {
        data: await railwayAPI.getBrokerHoldings(userId, { configId })
      };
    case 'positions':
      return {
        data: await railwayAPI.getBrokerPositions(userId, { configId })
      };
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
};

export const fetchBrokerOrders = async ({ userInput, bypassCache = false } = {}) => {
  const context = getActiveBrokerContext();

  if (!context) {
    return {
      success: false,
      status: 'no_connection',
      message: 'No active broker connection. Please connect to Zerodha to view order history.',
      needsAuth: true,
      data: []
    };
  }

  const userId = context.userId || extractUserId(userInput);
  const response = await railwayAPI.getBrokerOrders(userId, {
    configId: context.configId,
    bypassCache
  });

  if (response?.success === false) {
    const needsAuth = Boolean(
      response.needsAuth ||
      response.needs_reauth ||
      (response.code && ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'BROKER_UNAUTHORIZED', 'TOKEN_ERROR'].includes(response.code))
    );

    if (needsAuth) {
      markSessionNeedsAuth();
    }

    return {
      ...response,
      needsAuth
    };
  }

  if (response?.data?.session) {
    brokerSessionStore.persist(response.data.session);
  }

  return {
    ...response,
    needsAuth: false
  };
};

export const brokerSession = {
  load: () => brokerSessionStore.load(),
  persist: (payload) => brokerSessionStore.persist(payload),
  clear: () => brokerSessionStore.clear(),
  markNeedsReauth: () => brokerSessionStore.markNeedsReauth()
};
