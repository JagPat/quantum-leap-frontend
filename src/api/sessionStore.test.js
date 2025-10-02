import { describe, it, expect, beforeEach, vi } from 'vitest';
import { brokerSessionStore } from './sessionStore.js';

describe('sessionStore - Unified Schema (snake_case persist, camelCase load)', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('normalizeSessionPayload and transformToCamelCase', () => {
    it('should extract user_id from direct property', () => {
      const session = brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false
      });

      expect(session).not.toBeNull();
      expect(session.configId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(session.userId).toBe('EBW183');
      expect(session.brokerName).toBe('zerodha');
      expect(session.sessionStatus).toBe('connected');
      expect(session.needsReauth).toBe(false);
    });

    it('should extract user_id from nested user_data', () => {
      const session = brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_data: {
          user_id: 'EBW183',
          user_name: 'Test User'
        },
        broker_name: 'zerodha',
        session_status: 'connected'
      });

      expect(session).not.toBeNull();
      expect(session.userId).toBe('EBW183');
      expect(session.userData).toEqual({
        user_id: 'EBW183',
        user_name: 'Test User'
      });
    });

    it('should extract user_id from data.user_id (API response)', () => {
      const session = brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        data: {
          user_id: 'EBW183',
          broker_user_id: 'EBW183'
        },
        broker_name: 'zerodha'
      });

      expect(session).not.toBeNull();
      expect(session.userId).toBe('EBW183');
    });

    it('should handle camelCase input and convert to snake_case storage', () => {
      const session = brokerSessionStore.persist({
        configId: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'EBW183',
        brokerName: 'zerodha',
        sessionStatus: 'connected',
        needsReauth: false
      });

      expect(session).not.toBeNull();
      expect(session.configId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(session.userId).toBe('EBW183');
      
      // Verify storage is in snake_case
      const stored = JSON.parse(localStorage.getItem('activeBrokerSession'));
      expect(stored.config_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(stored.user_id).toBe('EBW183');
      expect(stored.broker_name).toBe('zerodha');
      expect(stored.session_status).toBe('connected');
      expect(stored.needs_reauth).toBe(false);
    });

    it('should warn but not fail when userId is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const session = brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        broker_name: 'zerodha',
        session_status: 'connected'
      });

      expect(session).not.toBeNull();
      expect(session.configId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(session.userId).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Normalizing session without userId'),
        expect.any(Object)
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should return null when configId is missing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const session = brokerSessionStore.persist({
        user_id: 'EBW183',
        broker_name: 'zerodha'
      });

      expect(session).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot normalize session - missing configId'),
        expect.any(Object)
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('persist() - Store in snake_case', () => {
    it('should store session in snake_case in localStorage', () => {
      brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false
      });

      const stored = JSON.parse(localStorage.getItem('activeBrokerSession'));
      
      expect(stored).toHaveProperty('config_id');
      expect(stored).toHaveProperty('user_id');
      expect(stored).toHaveProperty('broker_name');
      expect(stored).toHaveProperty('session_status');
      expect(stored).toHaveProperty('needs_reauth');
      
      // Should NOT have camelCase properties in storage
      expect(stored).not.toHaveProperty('configId');
      expect(stored).not.toHaveProperty('userId');
    });

    it('should return camelCase session for immediate use', () => {
      const session = brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false
      });

      // Return value should be camelCase
      expect(session).toHaveProperty('configId');
      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('brokerName');
      expect(session).toHaveProperty('sessionStatus');
      expect(session).toHaveProperty('needsReauth');
      
      // Should NOT have snake_case properties in return
      expect(session).not.toHaveProperty('config_id');
      expect(session).not.toHaveProperty('user_id');
    });

    it('should also persist to legacy brokerConfigs key', () => {
      brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected'
      });

      const legacy = JSON.parse(localStorage.getItem('brokerConfigs'));
      
      expect(legacy).toBeInstanceOf(Array);
      expect(legacy).toHaveLength(1);
      expect(legacy[0]).toHaveProperty('config_id');
      expect(legacy[0]).toHaveProperty('user_id');
    });
  });

  describe('load() - Transform to camelCase', () => {
    it('should load session and transform to camelCase', () => {
      // Manually set snake_case data in localStorage
      localStorage.setItem('activeBrokerSession', JSON.stringify({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false,
        connection_status: { state: 'connected' },
        last_token_refresh: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      }));

      const session = brokerSessionStore.load();

      expect(session).not.toBeNull();
      expect(session).toHaveProperty('configId', '123e4567-e89b-12d3-a456-426614174000');
      expect(session).toHaveProperty('userId', 'EBW183');
      expect(session).toHaveProperty('brokerName', 'zerodha');
      expect(session).toHaveProperty('sessionStatus', 'connected');
      expect(session).toHaveProperty('needsReauth', false);
      expect(session).toHaveProperty('connectionStatus');
      expect(session).toHaveProperty('lastTokenRefresh');
      expect(session).toHaveProperty('updatedAt');
      
      // Should NOT have snake_case properties
      expect(session).not.toHaveProperty('config_id');
      expect(session).not.toHaveProperty('user_id');
      expect(session).not.toHaveProperty('broker_name');
    });

    it('should return null when no session exists', () => {
      const session = brokerSessionStore.load();
      expect(session).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorage.setItem('activeBrokerSession', 'invalid json');
      const session = brokerSessionStore.load();

      expect(session).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('persist() + load() - Round-trip consistency', () => {
    it('should maintain data integrity through persist and load cycle', () => {
      const originalData = {
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false,
        connection_status: {
          state: 'connected',
          message: 'Successfully authenticated',
          lastChecked: '2025-01-01T00:00:00.000Z'
        },
        token_status: 'valid'
      };

      // Persist (returns camelCase)
      const persisted = brokerSessionStore.persist(originalData);
      
      // Load (also returns camelCase)
      const loaded = brokerSessionStore.load();

      // Both should have same camelCase structure
      expect(loaded.configId).toBe(persisted.configId);
      expect(loaded.userId).toBe(persisted.userId);
      expect(loaded.brokerName).toBe(persisted.brokerName);
      expect(loaded.sessionStatus).toBe(persisted.sessionStatus);
      expect(loaded.needsReauth).toBe(persisted.needsReauth);
      expect(loaded.connectionStatus).toEqual(persisted.connectionStatus);
      expect(loaded.tokenStatus).toBe(persisted.tokenStatus);
    });

    it('should handle OAuth callback data structure correctly', () => {
      // Simulate OAuth callback from backend
      const oauthCallbackData = {
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183', // From URL params
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false,
        connection_status: {
          state: 'connected',
          message: 'Successfully authenticated',
          lastChecked: new Date().toISOString()
        }
      };

      const persisted = brokerSessionStore.persist(oauthCallbackData);
      const loaded = brokerSessionStore.load();

      expect(loaded.configId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(loaded.userId).toBe('EBW183');
      expect(loaded.sessionStatus).toBe('connected');
      expect(loaded.needsReauth).toBe(false);
    });
  });

  describe('markNeedsReauth()', () => {
    it('should update session to needs_reauth status', () => {
      // First persist a connected session
      brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected',
        needs_reauth: false
      });

      // Mark as needs reauth
      brokerSessionStore.markNeedsReauth();

      // Load and verify
      const session = brokerSessionStore.load();
      expect(session.needsReauth).toBe(true);
      expect(session.sessionStatus).toBe('needs_reauth');

      // Verify storage is updated in snake_case
      const stored = JSON.parse(localStorage.getItem('activeBrokerSession'));
      expect(stored.needs_reauth).toBe(true);
      expect(stored.session_status).toBe('needs_reauth');
    });

    it('should handle missing session gracefully', () => {
      // No session exists
      brokerSessionStore.markNeedsReauth();
      
      const session = brokerSessionStore.load();
      expect(session).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should remove session from localStorage', () => {
      brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha'
      });

      expect(localStorage.getItem('activeBrokerSession')).not.toBeNull();
      expect(localStorage.getItem('brokerConfigs')).not.toBeNull();

      brokerSessionStore.clear();

      expect(localStorage.getItem('activeBrokerSession')).toBeNull();
      expect(localStorage.getItem('brokerConfigs')).toBeNull();
    });
  });

  describe('LEAK-001 and LEAK-002 - Regression Tests', () => {
    it('should fix LEAK-001: Session persistence mismatch', () => {
      // Previous bug: persist() returned snake_case, components expected camelCase
      const session = brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected'
      });

      // Fix: persist() now returns camelCase
      expect(session.userId).toBe('EBW183'); // Should work now
      expect(session.configId).toBe('123e4567-e89b-12d3-a456-426614174000'); // Should work now
    });

    it('should fix LEAK-002: Inconsistent property naming', () => {
      // Previous bug: load() returned snake_case
      brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected'
      });

      const loaded = brokerSessionStore.load();

      // Fix: load() now returns camelCase consistently
      expect(loaded).toHaveProperty('userId');
      expect(loaded).toHaveProperty('configId');
      expect(loaded).toHaveProperty('brokerName');
      expect(loaded).toHaveProperty('sessionStatus');
      
      // Should NOT have snake_case properties
      expect(loaded).not.toHaveProperty('user_id');
      expect(loaded).not.toHaveProperty('config_id');
    });

    it('should maintain Zerodha API compliance in storage', () => {
      // Zerodha API uses snake_case
      brokerSessionStore.persist({
        config_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: 'EBW183',
        broker_name: 'zerodha',
        session_status: 'connected'
      });

      // Verify storage maintains snake_case (Zerodha compliance)
      const stored = JSON.parse(localStorage.getItem('activeBrokerSession'));
      expect(stored).toHaveProperty('config_id');
      expect(stored).toHaveProperty('user_id');
      expect(stored).toHaveProperty('broker_name');
      expect(stored).toHaveProperty('session_status');
    });
  });
});
