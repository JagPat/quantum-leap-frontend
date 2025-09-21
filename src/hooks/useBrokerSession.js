import { useCallback, useEffect, useMemo, useState } from 'react';
import brokerAPI from '@/services/brokerAPI.js';
import { brokerSession } from '@/api/functions.js';

const isReauthRequired = (session) => {
  if (!session) return true;
  return Boolean(session.needsReauth || session.sessionStatus === 'needs_reauth');
};

export const useBrokerSession = () => {
  const [session, setSession] = useState(() => brokerSession.load());
  const [loading, setLoading] = useState(!session);
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ configId = null, userId = null } = {}) => {
    try {
      setLoading(true);
      setError(null);
      const status = await brokerAPI.checkConnectionStatus(configId, userId);
      const normalized = brokerSession.persist(status);
      setSession(normalized);
      setLoading(false);
      return normalized;
    } catch (err) {
      console.error('❌ [useBrokerSession] Failed to refresh session', err);
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!session) {
      refresh().catch(() => {});
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markNeedsReauth = useCallback(() => {
    brokerSession.markNeedsReauth();
    setSession((prev) => {
      if (!prev) return null;
      return { ...prev, needsReauth: true, sessionStatus: 'needs_reauth' };
    });
  }, []);

  const clearSession = useCallback(() => {
    brokerSession.clear();
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    session,
    loading,
    error,
    refresh,
    markNeedsReauth,
    clearSession,
    needsReauth: isReauthRequired(session)
  }), [session, loading, error, refresh, markNeedsReauth, clearSession]);

  return value;
};

export default useBrokerSession;
