import { describe, it, expect, beforeEach, vi } from 'vitest';
import { brokerSessionStore } from './sessionStore.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('brokerSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('persists and loads normalized session payload', () => {
    const payload = {
      config_id: 'config-123',
      user_id: 'user-789',
      broker_name: 'zerodha',
      session_status: 'connected',
      needs_reauth: false,
      connection_status: {
        state: 'connected',
        lastChecked: new Date().toISOString()
      }
    };

    const persisted = brokerSessionStore.persist(payload);
    expect(persisted).toBeDefined();

    // Mock localStorage to return the persisted data
    localStorageMock.getItem.mockReturnValue(JSON.stringify(persisted));

    const loaded = brokerSessionStore.load();
    expect(loaded).toMatchObject({
      config_id: payload.config_id,
      user_id: payload.user_id,
      broker_name: payload.broker_name,
      session_status: payload.session_status,
      needs_reauth: payload.needs_reauth
    });
  });

  it('marks session as needing reauthentication', () => {
    const payload = {
      config_id: 'config-123',
      user_id: 'user-789',
      broker_name: 'zerodha',
      session_status: 'connected',
      needs_reauth: false
    };

    brokerSessionStore.persist(payload);
    brokerSessionStore.markNeedsReauth();

    // Mock localStorage to return the updated data
    const updatedPayload = { ...payload, needs_reauth: true, session_status: 'needs_reauth' };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(updatedPayload));

    const loaded = brokerSessionStore.load();
    expect(loaded.needs_reauth).toBe(true);
    expect(loaded.session_status).toBe('needs_reauth');
  });

  it('handles empty localStorage gracefully', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const loaded = brokerSessionStore.load();
    expect(loaded).toBeNull();
  });
});
