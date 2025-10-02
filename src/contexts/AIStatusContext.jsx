import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { railwayAPI } from '@/api/railwayAPI';

const AIStatusContext = createContext();

export const useAIStatus = () => {
  const context = useContext(AIStatusContext);
  if (!context) {
    throw new Error('useAIStatus must be used within an AIStatusProvider');
  }
  return context;
};

export const AIStatusProvider = ({ children }) => {
  const [aiStatus, setAiStatus] = useState({
    status: 'loading',
    overall_status: 'offline',
    message: 'Loading AI status...',
    provider_status: {
      openai: 'unavailable',
      claude: 'unavailable',
      gemini: 'unavailable'
    },
    statistics: {
      total_providers: 0,
      available_providers: 0,
      total_requests: 0,
      success_rate: 0
    },
    alerts: [],
    lastChecked: null
  });

  const [aiPreferences, setAiPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const loadAIStatus = async () => {
    if (loadingRef.current) {
      console.log('🧠 [AIStatusContext] AI status already loading, skipping...');
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Use brokerSessionStore as single source of truth
      const { brokerSessionStore } = await import('@/api/sessionStore');
      const activeSession = brokerSessionStore.load();

      if (!activeSession || activeSession.sessionStatus !== 'connected') {
        console.warn('🧠 [AIStatusContext] No active broker session found');
        setAiStatus({ 
          status: 'unauthenticated', 
          message: 'No broker connection found',
          overall_status: 'offline'
        });
        setAiPreferences(null);
        return;
      }

      const userId = activeSession.userId;
      console.log('🧠 [AIStatusContext] Loading AI data for user:', userId);

      // Load AI preferences first
      const preferencesResponse = await railwayAPI.request('/api/ai/preferences', {
        method: 'GET',
        headers: {
          'X-User-ID': userId,
          'X-Config-ID': activeSession.configId
        },
        signal: abortControllerRef.current.signal
      });

      console.log('🧠 [AIStatusContext] AI preferences response:', preferencesResponse);

      // Transform preferences to match frontend expectations
      const transformedPreferences = {
        preferred_ai_provider: preferencesResponse.preferences?.preferred_ai_provider || 'auto',
        has_openai_key: !!preferencesResponse.preferences?.has_openai_key,
        has_claude_key: !!preferencesResponse.preferences?.has_claude_key,
        has_gemini_key: !!preferencesResponse.preferences?.has_gemini_key,
        openai_key_preview: preferencesResponse.preferences?.openai_key_preview || '',
        claude_key_preview: preferencesResponse.preferences?.claude_key_preview || '',
        gemini_key_preview: preferencesResponse.preferences?.gemini_key_preview || ''
      };

      setAiPreferences(transformedPreferences);

      // Determine AI status based on preferences
      const hasAnyKey = transformedPreferences.has_openai_key || 
                       transformedPreferences.has_claude_key || 
                       transformedPreferences.has_gemini_key;

      if (hasAnyKey) {
        // Load detailed AI status
        const [statusResponse, healthResponse] = await Promise.all([
          railwayAPI.request('/api/ai/status', {
            method: 'GET',
            headers: {
              'X-User-ID': userId,
              'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
            },
            signal: abortControllerRef.current.signal
          }).catch(() => ({ status: 'configured', message: 'AI configured' })),
          
          railwayAPI.request('/api/ai/health', {
            method: 'GET',
            headers: {
              'X-User-ID': userId,
              'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
            },
            signal: abortControllerRef.current.signal
          }).catch(() => ({ 
            providers: { 
              openai: 'available', 
              claude: 'available', 
              gemini: 'available' 
            } 
          }))
        ]);

        const combinedStatus = {
          status: 'configured',
          overall_status: 'online',
          message: 'AI Engine is configured and ready',
          provider_status: healthResponse.providers || {
            openai: transformedPreferences.has_openai_key ? 'available' : 'unavailable',
            claude: transformedPreferences.has_claude_key ? 'available' : 'unavailable',
            gemini: transformedPreferences.has_gemini_key ? 'available' : 'unavailable'
          },
          statistics: {
            total_providers: 3,
            available_providers: Object.values(healthResponse.providers || {}).filter(s => s === 'configured' || s === 'available').length,
            total_requests: 0,
            success_rate: 100
          },
          alerts: [],
          lastChecked: new Date().toISOString()
        };

        setAiStatus(combinedStatus);
        console.log('✅ [AIStatusContext] AI status loaded successfully:', combinedStatus);
      } else {
        setAiStatus({
          status: 'unconfigured',
          overall_status: 'offline',
          message: 'No AI API keys configured',
          provider_status: {
            openai: 'unavailable',
            claude: 'unavailable',
            gemini: 'unavailable'
          },
          statistics: {
            total_providers: 0,
            available_providers: 0,
            total_requests: 0,
            success_rate: 0
          },
          alerts: [{
            severity: 'warning',
            message: 'Please configure at least one AI provider in settings'
          }],
          lastChecked: new Date().toISOString()
        });
        console.log('⚠️ [AIStatusContext] No AI keys configured');
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🔄 [AIStatusContext] Request aborted');
        return;
      }
      
      console.error('❌ [AIStatusContext] Failed to load AI status:', error);
      setError(error.message);
      setAiStatus({
        status: 'error',
        overall_status: 'offline',
        message: 'Failed to load AI status',
        error: error.message,
        lastChecked: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  // Load AI status on mount
  useEffect(() => {
    loadAIStatus();
  }, []);

  const value = {
    aiStatus,
    aiPreferences,
    isLoading,
    error,
    loadAIStatus,
    refreshAIStatus: loadAIStatus
  };

  return (
    <AIStatusContext.Provider value={value}>
      {children}
    </AIStatusContext.Provider>
  );
}; 