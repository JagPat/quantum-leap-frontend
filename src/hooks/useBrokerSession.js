import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const sessionRef = useRef(initialSession);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refresh = useCallback(async ({ configId = null, userId = null, silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const fallback = brokerSession.load();
      const snapshot = sessionRef.current;
      const effectiveConfigId = configId ?? snapshot?.configId ?? fallback?.configId ?? null;
      const effectiveUserId = userId ?? snapshot?.userId ?? fallback?.userId ?? null;

      if (!effectiveConfigId && !effectiveUserId) {
        console.warn('[useBrokerSession] Skipping status refresh - no config_id or user_id available', {
          fromArgs: { configId, userId },
          fromSession: snapshot,
          fromStorage: fallback
        });
        if (!silent) setLoading(false);
        return null;
      }

      const status = await brokerAPI.checkConnectionStatus(effectiveConfigId, effectiveUserId);
      if (!status) {
        console.info('[useBrokerSession] Status refresh skipped - broker API returned no data');
        if (!silent) setLoading(false);
        return null;
      }

      const normalized = brokerSession.persist(status);
      setSession(normalized);
      if (!silent) setLoading(false);
      return normalized;
    } catch (err) {
      console.error('❌ [useBrokerSession] Failed to refresh session', err);
      setError(err);
      if (!silent) setLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const stored = brokerSession.load();
        if (stored && active) {
          setSession(stored);
          sessionRef.current = stored;
        }

        const bootstrapConfigId = stored?.configId ?? initialSession?.configId ?? null;
        const bootstrapUserId = stored?.userId ?? initialSession?.userId ?? null;

        if (!bootstrapConfigId && !bootstrapUserId) {
          console.info('[useBrokerSession] Bootstrap skipped - no broker identifiers available yet');
          if (active) {
            setLoading(false);
          }
          return;
        }

        await refresh({
          configId: bootstrapConfigId,
          userId: bootstrapUserId,
          silent: true
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

  const setBrokerSession = useCallback(({ configId, userId, brokerName = 'zerodha', sessionStatus = 'pending' } = {}) => {
    if (!configId || !userId) {
      console.warn('[useBrokerSession] Refusing to persist broker session without identifiers', {
        configId,
        userId,
        brokerName,
        sessionStatus
      });
      return null;
    }

    const persisted = brokerSession.persist({
      config_id: configId,
      user_id: userId,
      broker_name: brokerName,
      session_status: sessionStatus,
      needs_reauth: false
    });

    setSession(persisted);
    sessionRef.current = persisted;
    return persisted;
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
    setBrokerSession,
    clearSession,
    needsReauth: isReauthRequired(session)
  }), [session, loading, error, refresh, markNeedsReauth, setBrokerSession, clearSession]);

  return value;
};

export default useBrokerSession;
