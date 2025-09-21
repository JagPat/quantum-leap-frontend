import { describe, it, expect, beforeEach } from 'vitest';
import { brokerSessionStore, normalizeBrokerSession } from './sessionStore.js';

const STORAGE_KEY = 'activeBrokerSession';

const mockSession = () => ({
  config_id: 'config-123',
  user_id: 'user-789',
  broker_name: 'zerodha',
  session_status: 'connected',
  needs_reauth: false,
  connection_status: {
    state: 'connected',
    lastChecked: new Date().toISOString()
  }
});

beforeEach(() => {
  localStorage.clear();
});

describe('brokerSessionStore', () => {
  it('persists and loads normalized session payload', () => {
    const payload = mockSession();
    brokerSessionStore.persist(payload);

    const storedRaw = localStorage.getItem(STORAGE_KEY);
    expect(storedRaw).toBeTruthy();

    const loaded = brokerSessionStore.load();
    expect(loaded).toMatchObject({
      configId: payload.config_id,
      userId: payload.user_id,
      brokerName: 'zerodha',
      needsReauth: false
    });
  });

  it('marks session as needing reauthentication', () => {
    brokerSessionStore.persist(mockSession());
    brokerSessionStore.markNeedsReauth();

    const loaded = brokerSessionStore.load();
    expect(loaded.needsReauth).toBe(true);
    expect(loaded.sessionStatus).toBe('needs_reauth');
  });

  it('normalizes partial payload safely', () => {
    const normalized = normalizeBrokerSession({
      config_id: 'config-abc',
      user_id: 'user-123'
    });

    expect(normalized).toMatchObject({
      configId: 'config-abc',
      userId: 'user-123'
    });
  });
});
