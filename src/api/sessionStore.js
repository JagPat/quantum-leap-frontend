const ACTIVE_SESSION_KEY = 'activeBrokerSession';
const LEGACY_CONFIGS_KEY = 'brokerConfigs';

/**
 * Normalize session payload to snake_case for storage (Zerodha API compliance)
 * @param {Object} payload - Session data from any source
 * @returns {Object|null} - Normalized session in snake_case or null if invalid
 */
const normalizeSessionPayload = (payload = {}) => {
  if (!payload) return null;

  // Extract config_id from multiple possible sources
  const configId = payload.config_id || payload.configId || payload.id || null;
  
  // Extract user_id from multiple possible sources
  // Priority: direct user_id > nested user_data > broker_user_id > userId (camelCase)
  const userId = payload.user_id || 
                 payload.user_data?.user_id || 
                 payload.data?.user_id ||
                 payload.broker_user_id || 
                 payload.userId || 
                 null;

  if (!configId) {
    console.warn('[sessionStore] Cannot normalize session - missing configId', payload);
    return null;
  }
  
  // Allow missing userId for now - some API responses don't include it initially
  if (!userId) {
    console.warn('[sessionStore] Normalizing session without userId - this may cause issues', { 
      configId, 
      payload: { ...payload, access_token: payload.access_token ? '[REDACTED]' : undefined } 
    });
  }

  const needsReauth = Boolean(payload.needs_reauth ?? payload.needsReauth ?? false);
  const sessionStatus = payload.session_status || payload.sessionStatus || (needsReauth ? 'needs_reauth' : 'connected');

  // IMPORTANT: Store in snake_case for Zerodha API compliance and backend consistency
  return {
    config_id: configId,
    user_id: userId,
    broker_name: payload.broker_name || payload.brokerName || 'zerodha',
    session_status: sessionStatus,
    needs_reauth: needsReauth,
    connection_status: payload.connection_status || payload.connectionStatus || null,
    last_token_refresh: payload.last_token_refresh || payload.lastTokenRefresh || null,
    last_status_check: payload.last_status_check || payload.lastStatusCheck || null,
    token_status: payload.token_status || payload.tokenStatus || null,
    user_data: payload.user_data || null,
    access_token: payload.access_token || payload.accessToken || null,  // ✅ Preserve access_token
    updated_at: new Date().toISOString()
  };
};

/**
 * Transform snake_case session to camelCase for frontend consumption
 * This is the CRITICAL transformation that fixes LEAK-001 and LEAK-002
 * @param {Object} session - Session data in snake_case
 * @returns {Object} - Session data in camelCase
 */
const transformToCamelCase = (session) => {
  if (!session) return null;

  return {
    configId: session.config_id,
    userId: session.user_id,
    brokerName: session.broker_name,
    sessionStatus: session.session_status,
    needsReauth: session.needs_reauth,
    connectionStatus: session.connection_status,
    lastTokenRefresh: session.last_token_refresh,
    lastStatusCheck: session.last_status_check,
    tokenStatus: session.token_status,
    accessToken: session.access_token,  // ✅ Include access_token in camelCase transform
    userData: session.user_data,
    updatedAt: session.updated_at
  };
};

const persistLegacyConfigs = (session) => {
  if (!session) {
    localStorage.removeItem(LEGACY_CONFIGS_KEY);
    return;
  }

  const legacyConfig = {
    config_id: session.config_id,
    broker_name: session.broker_name,
    user_id: session.user_id,
    is_connected: !session.needs_reauth,
    connection_status: session.connection_status || {
      state: session.session_status,
      lastChecked: session.updated_at
    },
    needs_reauth: session.needs_reauth,
    session_status: session.session_status,
    last_token_refresh: session.last_token_refresh
  };

  localStorage.setItem(LEGACY_CONFIGS_KEY, JSON.stringify([legacyConfig]));
};

export const brokerSessionStore = {
  /**
   * Persist session data to localStorage in snake_case (Zerodha API compliance)
   * @param {Object} payload - Session data from any source
   * @returns {Object|null} - Normalized session in camelCase for immediate use, or null if failed
   */
  persist(payload) {
    console.log('💾 [brokerSessionStore] persist() called with payload:', {
      ...payload,
      access_token: payload?.access_token ? '[REDACTED]' : undefined
    });
    
    const normalized = normalizeSessionPayload(payload);
    console.log('💾 [brokerSessionStore] Storing to localStorage:', {
      configId: normalized?.config_id,
      userId: normalized?.user_id,
      sessionStatus: normalized?.session_status
    });
    
    if (!normalized) {
      console.error('❌ [brokerSessionStore] persist() failed - normalization returned null');
      return null;
    }

    try {
      // Store in snake_case for backend consistency
      const jsonString = JSON.stringify(normalized);
      localStorage.setItem(ACTIVE_SESSION_KEY, jsonString);
      console.log('✅ [brokerSessionStore] Successfully persisted to localStorage (snake_case)');
      
      // Verify it was saved
      const verify = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!verify) {
        console.error('❌ [brokerSessionStore] CRITICAL: localStorage.setItem succeeded but getItem returns null!');
      } else {
        console.log('✅ [brokerSessionStore] Verified: session saved and retrievable');
      }
    } catch (error) {
      console.error('❌ [brokerSessionStore] localStorage.setItem failed:', error);
      return null;
    }

    persistLegacyConfigs(normalized);
    
    // Return camelCase version for immediate use
    const camelCase = transformToCamelCase(normalized);
    console.log('🔄 [brokerSessionStore] Returning camelCase session:', {
      configId: camelCase?.configId,
      userId: camelCase?.userId,
      sessionStatus: camelCase?.sessionStatus
    });
    return camelCase;
  },

  /**
   * Load session data from localStorage and transform to camelCase
   * CRITICAL FIX: This transformation resolves LEAK-001 and LEAK-002
   * @returns {Object|null} - Session data in camelCase for frontend consumption
   */
  load() {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      console.log('📖 [brokerSessionStore] Loaded raw session from localStorage:', {
        config_id: parsed?.config_id,
        user_id: parsed?.user_id,
        session_status: parsed?.session_status
      });
      
      // Normalize to ensure consistency (handles legacy data)
      const normalized = normalizeSessionPayload(parsed);
      
      // Transform to camelCase for frontend consumption
      const camelCase = transformToCamelCase(normalized);
      console.log('🔄 [brokerSessionStore] Transformed to camelCase:', {
        configId: camelCase?.configId,
        userId: camelCase?.userId,
        sessionStatus: camelCase?.sessionStatus
      });
      
      return camelCase;
    } catch (error) {
      console.error('❌ [brokerSessionStore] Failed to load active session:', error);
      return null;
    }
  },

  clear() {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    localStorage.removeItem(LEGACY_CONFIGS_KEY);
  },

  markNeedsReauth() {
    // Load as camelCase
    const session = this.load();
    if (!session) return;
    
    // Update flags
    session.needsReauth = true;
    session.sessionStatus = 'needs_reauth';
    
    // Convert back to snake_case for storage
    const snakeCase = {
      config_id: session.configId,
      user_id: session.userId,
      broker_name: session.brokerName,
      session_status: session.sessionStatus,
      needs_reauth: session.needsReauth,
      connection_status: session.connectionStatus,
      last_token_refresh: session.lastTokenRefresh,
      last_status_check: session.lastStatusCheck,
      token_status: session.tokenStatus,
      user_data: session.userData,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(snakeCase));
    persistLegacyConfigs(snakeCase);
  }
};

export const normalizeBrokerSession = normalizeSessionPayload;
