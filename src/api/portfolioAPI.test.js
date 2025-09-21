import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionStore from './sessionStore.js';
import { portfolioAPI, fetchBrokerOrders } from './functions.js';
import { railwayAPI } from './railwayAPI.js';

vi.mock('./railwayAPI.js', () => ({
  railwayAPI: {
    getPortfolioData: vi.fn(),
    getBrokerOrders: vi.fn()
  }
}));

const mockSession = {
  configId: 'config-123',
  userId: 'user-456',
  needsReauth: false
};

beforeEach(() => {
  vi.spyOn(sessionStore, 'brokerSessionStore', 'get').mockReturnValue({
    load: () => mockSession,
    persist: vi.fn(),
    markNeedsReauth: vi.fn()
  });
  vi.clearAllMocks();
});

describe('portfolioAPI', () => {
  it('returns success data when backend succeeds', async () => {
    railwayAPI.getPortfolioData.mockResolvedValue({
      success: true,
      data: { holdings: [], positions: [], summary: {} }
    });

    const result = await portfolioAPI('user-456');
    expect(result.success).toBe(true);
    expect(railwayAPI.getPortfolioData).toHaveBeenCalledWith('user-456', {
      configId: mockSession.configId,
      bypassCache: false
    });
  });

  it('propagates needsAuth flag when backend indicates reauth', async () => {
    railwayAPI.getPortfolioData.mockResolvedValue({
      success: false,
      code: 'TOKEN_EXPIRED',
      needsAuth: true,
      data: { holdings: [], positions: [] }
    });

    const result = await portfolioAPI('user-456');
    expect(result.needsAuth).toBe(true);
  });

  it('does not mark needsAuth on network failure', async () => {
    railwayAPI.getPortfolioData.mockRejectedValue(new Error('Network down'));

    const result = await portfolioAPI('user-456');
    expect(result.needsAuth).toBe(false);
  });
});

describe('fetchBrokerOrders', () => {
  beforeEach(() => {
    vi.spyOn(sessionStore, 'brokerSessionStore', 'get').mockReturnValue({
      load: () => mockSession,
      persist: vi.fn(),
      markNeedsReauth: vi.fn()
    });
  });

  it('persists session data when orders response includes session', async () => {
    railwayAPI.getBrokerOrders.mockResolvedValue({
      success: true,
      data: {
        orders: [],
        session: {
          config_id: 'config-123',
          user_id: 'user-456',
          broker_name: 'zerodha'
        }
      }
    });

    const result = await fetchBrokerOrders({ bypassCache: false });
    expect(result.needsAuth).toBe(false);
    expect(sessionStore.brokerSessionStore.persist).toHaveBeenCalled();
  });

  it('marks needsAuth only for auth errors', async () => {
    railwayAPI.getBrokerOrders.mockResolvedValue({
      success: false,
      code: 'TOKEN_EXPIRED'
    });

    const result = await fetchBrokerOrders({});
    expect(result.needsAuth).toBe(true);
    expect(sessionStore.brokerSessionStore.markNeedsReauth).toHaveBeenCalled();
  });
});
