const ACTIVE_SESSION_KEY = 'activeBrokerSession';
const LEGACY_CONFIGS_KEY = 'brokerConfigs';

const normalizeSessionPayload = (payload = {}) => {
  if (!payload) return null;

  const configId = payload.config_id || payload.configId || payload.id || null;
  // Try multiple sources for userId - API might return it in user_data
  const userId = payload.user_id || payload.userId || payload.user_data?.user_id || payload.broker_user_id || null;

  if (!configId) {
    console.warn('[sessionStore] Cannot normalize session - missing configId', payload);
    return null;
  }
  
  // Allow missing userId for now - some API responses don't include it initially
  if (!userId) {
    console.warn('[sessionStore] Normalizing session without userId - this may cause issues', { configId, payload });
  }

  const needsReauth = Boolean(payload.needs_reauth ?? payload.needsReauth ?? false);
  const sessionStatus = payload.session_status || payload.sessionStatus || (needsReauth ? 'needs_reauth' : 'connected');

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
    updated_at: new Date().toISOString()
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
  persist(payload) {
    console.log('🔧 [brokerSessionStore] persist() called with payload:', payload);
    const normalized = normalizeSessionPayload(payload);
    console.log('🔧 [brokerSessionStore] normalized result:', normalized);
    
    if (!normalized) {
      console.error('❌ [brokerSessionStore] persist() failed - normalization returned null');
      return null;
    }

    try {
      const jsonString = JSON.stringify(normalized);
      localStorage.setItem(ACTIVE_SESSION_KEY, jsonString);
      console.log('✅ [brokerSessionStore] Successfully persisted to localStorage');
      
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
    return normalized;
  },

  load() {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const normalized = normalizeSessionPayload(parsed);
      
      if (!normalized) return null;
      
      // Transform snake_case (storage format) to camelCase (component interface)
      // This maintains backward compatibility with components expecting camelCase
      return {
        configId: normalized.config_id,
        userId: normalized.user_id,
        brokerName: normalized.broker_name,
        sessionStatus: normalized.session_status,
        needsReauth: normalized.needs_reauth,
        connectionStatus: normalized.connection_status,
        lastTokenRefresh: normalized.last_token_refresh,
        lastStatusCheck: normalized.last_status_check,
        tokenStatus: normalized.token_status,
        userData: normalized.user_data,
        updatedAt: normalized.updated_at
      };
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
    const session = this.load();
    if (!session) return;
    session.needsReauth = true;
    session.sessionStatus = 'needs_reauth';
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    persistLegacyConfigs(session);
  }
};

export const normalizeBrokerSession = normalizeSessionPayload;
