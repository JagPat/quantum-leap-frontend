import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionStore from './sessionStore.js';
import { portfolioAPI } from './functions.js';
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
});
