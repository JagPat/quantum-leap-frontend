import React, { createContext, useContext, useEffect, useState } from 'react';
import { useBrokerSession } from '@/hooks/useBrokerSession';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const {
    session,
    isLoading,
    checkConnection,
    disconnect
  } = useBrokerSession();

  // Map useBrokerSession to legacy usePersistentAuth interface
  const isAuthenticated = session?.session_status === 'connected';
  const userData = session?.user_data || null;
  const connectionStatus = session?.connection_status?.state || 'disconnected';
  const lastChecked = session?.connection_status?.lastChecked || null;
  const refreshSession = checkConnection;
  const logout = disconnect;

  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load AI status when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userData) {
      loadAIStatus();
    } else {
      setAiStatus(null);
    }
  }, [isAuthenticated, userData]);

  const loadAIStatus = async () => {
    if (!userData?.user_id) return;

    setAiLoading(true);
    try {
      console.log('🔐 [AuthContext] Loading AI status for user:', userData.user_id);
      
      // Use brokerSessionStore as single source of truth
      const { brokerSessionStore } = await import('@/api/sessionStore');
      const activeSession = brokerSessionStore.load();

      if (!activeSession || activeSession.session_status !== 'connected') {
        console.warn('🔐 [AuthContext] No active broker session found for AI status');
        setAiStatus({ status: 'unauthenticated', message: 'No broker connection' });
        return;
      }

      // Check AI status
      const [statusResponse, healthResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/ai/status`, {
          headers: {
            'X-User-ID': userData.user_id,
            'X-Config-ID': activeSession.config_id
          }
        }),
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/ai/health`, {
          headers: {
            'X-User-ID': userData.user_id,
            'X-Config-ID': activeSession.config_id
          }
        })
      ]);

      const statusData = await statusResponse.json();
      const healthData = await healthResponse.json();

      setAiStatus({
        ...statusData,
        ...healthData,
        lastChecked: new Date().toISOString()
      });

      console.log('✅ [AuthContext] AI status loaded:', statusData);
    } catch (error) {
      console.error('❌ [AuthContext] Failed to load AI status:', error);
      setAiStatus({ 
        status: 'error', 
        message: 'Failed to load AI status',
        error: error.message 
      });
    } finally {
      setAiLoading(false);
    }
  };

  const refreshAIStatus = async () => {
    await loadAIStatus();
  };

  const value = {
    // Authentication state
    isAuthenticated,
    userData,
    isLoading,
    connectionStatus,
    lastChecked,
    
    // AI state
    aiStatus,
    aiLoading,
    
    // Actions
    refreshSession,
    logout,
    refreshAIStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 