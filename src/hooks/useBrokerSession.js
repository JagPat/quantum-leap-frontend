import { useCallback, useEffect, useMemo, useState } from 'react';
import brokerAPI from '@/services/brokerAPI.js';
import { brokerSession } from '@/api/functions.js';

const isReauthRequired = (session) => {
  if (!session) return true;
  return Boolean(session.needsReauth || session.sessionStatus === 'needs_reauth');
};

export const useBrokerSession = () => {
  const initialSession = brokerSession.load();
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ configId = null, userId = null, silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const status = await brokerAPI.checkConnectionStatus(configId, userId);
      const normalized = brokerSession.persist(status);
      setSession(normalized);
      if (!silent) {
        setLoading(false);
      }
      return normalized;
    } catch (err) {
      console.error('❌ [useBrokerSession] Failed to refresh session', err);
      setError(err);
      if (!silent) {
        setLoading(false);
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await refresh({
          configId: initialSession?.configId || undefined,
          userId: initialSession?.userId || undefined,
          silent: false
        });
      } catch (err) {
        if (!initialSession && active) {
          setSession(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
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
    setLoading(false);
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
