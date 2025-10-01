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
    configId,
    userId,
    brokerName: payload.broker_name || payload.brokerName || 'zerodha',
    sessionStatus,
    needsReauth,
    connectionStatus: payload.connection_status || payload.connectionStatus || null,
    lastTokenRefresh: payload.last_token_refresh || payload.lastTokenRefresh || null,
    lastStatusCheck: payload.last_status_check || payload.lastStatusCheck || null,
    tokenStatus: payload.token_status || payload.tokenStatus || null,
    updatedAt: new Date().toISOString()
  };
};

const persistLegacyConfigs = (session) => {
  if (!session) {
    localStorage.removeItem(LEGACY_CONFIGS_KEY);
    return;
  }

  const legacyConfig = {
    config_id: session.configId,
    broker_name: session.brokerName,
    user_id: session.userId,
    is_connected: !session.needsReauth,
    connection_status: session.connectionStatus || {
      state: session.sessionStatus,
      lastChecked: session.updatedAt
    },
    needs_reauth: session.needsReauth,
    session_status: session.sessionStatus,
    last_token_refresh: session.lastTokenRefresh
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
      return normalizeSessionPayload(parsed);
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
