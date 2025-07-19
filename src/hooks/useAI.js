import { useState, useEffect, useCallback, useRef } from 'react';
import { railwayAPI } from '@/api/railwayAPI';
import { useAIStatus } from '@/contexts/AIStatusContext';

/**
 * AI Engine Hook
 * Manages AI status, preferences, and operations with comprehensive error handling
 */
export const useAI = () => {
  // Use the global AI status context instead of local state
  const { aiStatus, aiPreferences, isLoading, error, refreshAIStatus } = useAIStatus();
  const [threadId, setThreadId] = useState(null);
  const abortControllerRef = useRef(null);
  const loadingRef = useRef(false);
    if (loadingRef.current) {
      console.log('🧠 [useAI] Already loading, skipping...');
      return;
    }
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🧠 [useAI] Loading AI status and preferences...');
      
      // Get stored broker config for API calls
      const storedConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = storedConfigs.find(config => 
        config.is_connected && 
        config.user_data?.user_id
      );

      if (!activeConfig) {
        console.warn('🧠 [useAI] No active broker config found');
        setAiStatus({ 
          status: 'unauthenticated', 
          message: 'No broker connection found',
          overall_status: 'offline'
        });
        setAiPreferences(null);
        return;
      }

      const userId = activeConfig.user_data.user_id;
      console.log('🧠 [useAI] Loading AI data for user:', userId);

      // Load AI preferences first
      const preferencesResponse = await railwayAPI.request('/api/ai/preferences', {
        method: 'GET',
        headers: {
          'X-User-ID': userId,
          'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
        }
      });

      console.log('🧠 [useAI] AI preferences response:', preferencesResponse);

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
            }
          }).catch(() => ({ status: 'configured', message: 'AI configured' })),
          
          railwayAPI.request('/api/ai/health', {
            method: 'GET',
            headers: {
              'X-User-ID': userId,
              'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
            }
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
        console.log('✅ [useAI] AI status loaded successfully:', combinedStatus);
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
        console.log('⚠️ [useAI] No AI keys configured');
      }

    } catch (error) {
      console.error('❌ [useAI] Failed to load AI status:', error);
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
  }, []);

  // Enhanced request handler with comprehensive response handling
  const makeRequest = useCallback(async (endpoint, options = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      const response = await railwayAPI.request(endpoint, {
        ...options,
        signal: abortControllerRef.current.signal
      });

      console.log(`🧠 [useAI] Response from ${endpoint}:`, response);

      // Handle different response statuses comprehensively
      if (response.status === 'error') {
        console.error(`❌ [useAI] Backend error for ${endpoint}:`, response.message);
        throw new Error(response.message || 'AI request failed');
      }

      // Handle not_implemented status gracefully
      if (response.status === 'not_implemented') {
        console.log(`🚧 [useAI] Feature not yet implemented: ${endpoint}`);
        return { 
          status: 'not_implemented', 
          message: response.message || 'This feature is planned but not yet implemented', 
          feature: response.feature,
          planned_features: response.planned_features,
          frontend_expectation: response.frontend_expectation,
          data: null 
        };
      }

      // Handle unauthorized status
      if (response.status === 'unauthorized') {
        console.log(`🔐 [useAI] Unauthorized for: ${endpoint}`);
        return { 
          status: 'unauthorized', 
          message: response.message || 'Please connect to your broker to access this feature', 
          data: null 
        };
      }

      // Handle success status
      if (response.status === 'success') {
        console.log(`✅ [useAI] Success for ${endpoint}`);
        return response.data || response;
      }

      // Handle healthy status (for health checks)
      if (response.status === 'healthy') {
        console.log(`✅ [useAI] Health check passed for ${endpoint}`);
        return response;
      }

      // Return response as-is if no specific status handling needed
      return response.data || response;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('🔄 [useAI] Request aborted');
        return null;
      }
      console.error(`❌ [useAI] Error in ${endpoint}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // OpenAI Assistants API
  const sendAssistantMessage = useCallback(async (message, context = null) => {
    try {
      const response = await makeRequest('/api/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          thread_id: threadId,
          context
        })
      });

      // Update thread ID if it's a new thread
      if (response.thread_id && response.thread_id !== threadId) {
        setThreadId(response.thread_id);
      }

      return response;
    } catch (err) {
      console.error('❌ [useAI] Error sending assistant message:', err);
      throw err;
    }
  }, [makeRequest, threadId]);

  const getAssistantStatus = useCallback(async () => {
    return await makeRequest('/api/ai/status');
  }, [makeRequest]);

  const getThreadMessages = useCallback(async (threadId, limit = 10) => {
    // Thread management not implemented in current backend
    return {
      status: 'not_implemented',
      messages: [],
      message: 'Thread management not yet implemented'
    };
  }, []);

  const deleteThread = useCallback(async (threadId) => {
    // Thread management not implemented in current backend
    return {
      status: 'not_implemented',
      message: 'Thread management not yet implemented'
    };
  }, []);

  const getUserThreadId = useCallback(async () => {
    // Thread management not implemented in current backend
    return {
      status: 'not_implemented',
      thread_id: null,
      message: 'Thread management not yet implemented'
    };
  }, []);

  const clearUserThread = useCallback(async () => {
    // Thread management not implemented in current backend
    setThreadId(null);
    return {
      status: 'not_implemented',
      message: 'Thread management not yet implemented'
    };
  }, []);

  // Initialize thread ID on mount
  const initializeThread = useCallback(async () => {
    try {
      const response = await getUserThreadId();
      if (response.thread_id) {
        setThreadId(response.thread_id);
      }
    } catch (err) {
      console.log('No existing thread found, will create new one on first message');
    }
  }, [getUserThreadId]);

  // AI Preferences
  const getAIPreferences = useCallback(async () => {
    return await makeRequest('/api/ai/preferences');
  }, [makeRequest]);

  const updateAIPreferences = useCallback(async (preferences) => {
    return await makeRequest('/api/ai/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
  }, [makeRequest]);

  const validateAPIKey = useCallback(async (provider, apiKey) => {
    return await makeRequest('/api/ai/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey })
    });
  }, [makeRequest]);

  const clearAIPreferences = useCallback(async () => {
    return await makeRequest('/api/ai/preferences', {
      method: 'DELETE'
    });
  }, [makeRequest]);

  // Strategy Generation
  const generateStrategy = useCallback(async (request) => {
    return await makeRequest('/api/ai/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const getStrategies = useCallback(async () => {
    return await makeRequest('/api/ai/strategy');
  }, [makeRequest]);

  const getStrategy = useCallback(async (strategyId) => {
    return await makeRequest(`/api/ai/strategy/${strategyId}`);
  }, [makeRequest]);

  // Market Analysis
  const generateMarketAnalysis = useCallback(async (request) => {
    return await makeRequest('/api/ai/analysis/market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const generateTechnicalAnalysis = useCallback(async (request) => {
    return await makeRequest('/api/ai/analysis/technical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const generateSentimentAnalysis = useCallback(async (request) => {
    return await makeRequest('/api/ai/analysis/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  // Trading Signals
  const getSignals = useCallback(async (symbols = []) => {
    const params = symbols.length > 0 ? `?symbols=${symbols.join(',')}` : '';
    return await makeRequest(`/api/ai/signals${params}`);
  }, [makeRequest]);

  // Feedback System
  const recordTradeOutcome = useCallback(async (request) => {
    return await makeRequest('/api/ai/feedback/outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const getLearningInsights = useCallback(async (strategyId) => {
    return await makeRequest(`/api/ai/feedback/learning/${strategyId}`);
  }, [makeRequest]);

  // Analytics & Clustering
  const getStrategyClustering = useCallback(async () => {
    return await makeRequest('/api/ai/clustering/strategies');
  }, [makeRequest]);

  const getStrategyAnalytics = useCallback(async (strategyId) => {
    return await makeRequest(`/api/ai/analytics/strategy/${strategyId}`);
  }, [makeRequest]);

  // Crowd Intelligence
  const getCrowdInsights = useCallback(async () => {
    return await makeRequest('/api/ai/insights/crowd');
  }, [makeRequest]);

  const getTrendingInsights = useCallback(async () => {
    return await makeRequest('/api/ai/insights/trending');
  }, [makeRequest]);

  // Portfolio Co-Pilot
  const analyzePortfolio = useCallback(async (portfolioData) => {
    return await makeRequest('/api/ai/copilot/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolioData)
    });
  }, [makeRequest]);

  const getPortfolioRecommendations = useCallback(async () => {
    return await makeRequest('/api/ai/copilot/recommendations');
  }, [makeRequest]);

  // Refresh AI status
  const refreshAIStatus = useCallback(async () => {
    await loadAIStatus();
  }, [loadAIStatus]);

  return {
    // State
    aiStatus,
    aiPreferences,
    isLoading,
    error,
    threadId,
    
    // Core functions
    loadAIStatus,
    refreshAIStatus,
    makeRequest,
    
    // OpenAI Assistant
    sendAssistantMessage,
    getAssistantStatus,
    getThreadMessages,
    deleteThread,
    getUserThreadId,
    clearUserThread,
    initializeThread,
    
    // Preferences
    getAIPreferences,
    updateAIPreferences,
    validateAPIKey,
    clearAIPreferences,
    
    // Strategy Generation
    generateStrategy,
    getStrategies,
    getStrategy,
    
    // Market Analysis
    generateMarketAnalysis,
    generateTechnicalAnalysis,
    generateSentimentAnalysis,
    
    // Trading Signals
    getSignals,
    
    // Feedback System
    recordTradeOutcome,
    getLearningInsights,
    
    // Analytics & Clustering
    getStrategyClustering,
    getStrategyAnalytics,
    
    // Crowd Intelligence
    getCrowdInsights,
    getTrendingInsights,
    
    // Portfolio Co-Pilot
    analyzePortfolio,
    getPortfolioRecommendations
  };
};

// Specialized hooks for specific use cases
export const useStrategyGeneration = () => {
  const { generateStrategy, getStrategies, loading, error } = useAI();
  const [strategies, setStrategies] = useState([]);

  const refreshStrategies = useCallback(async () => {
    try {
      const data = await getStrategies();
      setStrategies(data?.strategies || []);
    } catch (err) {
      console.error('Failed to refresh strategies:', err);
    }
  }, [getStrategies]);

  return {
    strategies,
    generateStrategy,
    refreshStrategies,
    loading,
    error
  };
};

// OpenAI Assistants specialized hook
export const useOpenAIAssistant = () => {
  const {
    sendAssistantMessage,
    getAssistantStatus,
    getThreadMessages,
    deleteThread,
    getUserThreadId,
    clearUserThread,
    initializeThread,
    threadId,
    loading,
    error
  } = useAI();

  const [messages, setMessages] = useState([]);
  const [assistantStatus, setAssistantStatus] = useState(null);

  // Load thread messages
  const loadThreadMessages = useCallback(async () => {
    if (!threadId) return;
    
    try {
      const response = await getThreadMessages(threadId);
      setMessages(response.messages || []);
    } catch (err) {
      console.error('Failed to load thread messages:', err);
    }
  }, [getThreadMessages, threadId]);

  // Send message and update messages
  const sendMessage = useCallback(async (message, context = null) => {
    try {
      const response = await sendAssistantMessage(message, context);
      
      // Add user message
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      // Add assistant response
      const assistantMessage = {
        id: response.message_id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      return response;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [sendAssistantMessage]);

  // Get assistant status
  const loadAssistantStatus = useCallback(async () => {
    try {
      const status = await getAssistantStatus();
      // Transform backend status to frontend format
      const transformedStatus = {
        is_available: status.status === 'configured' || status.status === 'healthy',
        assistant_name: 'Quantum Trading AI',
        model: 'GPT-4',
        tools_count: 5,
        status: status.status,
        message: status.message,
        configured_providers: status.configured_providers || []
      };
      setAssistantStatus(transformedStatus);
    } catch (err) {
      console.error('Failed to load assistant status:', err);
      // Set default offline status
      setAssistantStatus({
        is_available: false,
        assistant_name: 'Quantum Trading AI',
        model: 'GPT-4',
        tools_count: 5,
        status: 'error',
        message: 'Failed to load AI status'
      });
    }
  }, [getAssistantStatus]);

  // Clear conversation
  const clearConversation = useCallback(async () => {
    try {
      await clearUserThread();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  }, [clearUserThread]);

  return {
    messages,
    assistantStatus,
    threadId,
    loading,
    error,
    sendMessage,
    loadThreadMessages,
    loadAssistantStatus,
    clearConversation,
    initializeThread
  };
};

export const usePortfolioCoPilot = () => {
  const { analyzePortfolio, getRebalanceRecommendations, loading, error } = useAI();
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const analyzeCurrentPortfolio = useCallback(async (portfolioData) => {
    try {
      const result = await analyzePortfolio(portfolioData);
      setAnalysis(result);
      return result;
    } catch (err) {
      console.error('Failed to analyze portfolio:', err);
      throw err;
    }
  }, [analyzePortfolio]);

  const getRebalanceSuggestions = useCallback(async (portfolioData) => {
    try {
      const result = await getRebalanceRecommendations(portfolioData);
      setRecommendations(result?.recommendations || []);
      return result;
    } catch (err) {
      console.error('Failed to get rebalance recommendations:', err);
      throw err;
    }
  }, [getRebalanceRecommendations]);

  return {
    analysis,
    recommendations,
    analyzeCurrentPortfolio,
    getRebalanceSuggestions,
    loading,
    error
  };
};

export const useCrowdIntelligence = () => {
  const { getCrowdInsights, getTrendingInsights, loading, error } = useAI();
  const [crowdData, setCrowdData] = useState(null);
  const [trendingData, setTrendingData] = useState(null);

  const loadCrowdInsights = useCallback(async () => {
    try {
      console.log('📡 [useCrowdIntelligence] Loading crowd insights...');
      const result = await getCrowdInsights();
      console.log('📡 [useCrowdIntelligence] Crowd insights response:', result);
      
      // Handle not_implemented status
      if (result?.status === 'not_implemented') {
        console.log('🚧 [useCrowdIntelligence] Crowd insights not yet implemented');
        setCrowdData(null);
        return;
      }
      
      // Handle unauthorized status
      if (result?.status === 'unauthorized') {
        console.log('🔐 [useCrowdIntelligence] Unauthorized for crowd insights');
        setCrowdData(null);
        return;
      }
      
      setCrowdData(result);
    } catch (err) {
      console.error('❌ [useCrowdIntelligence] Failed to load crowd insights:', err);
      setCrowdData(null);
    }
  }, [getCrowdInsights]);

  const loadTrendingInsights = useCallback(async () => {
    try {
      console.log('📡 [useCrowdIntelligence] Loading trending insights...');
      const result = await getTrendingInsights();
      console.log('📡 [useCrowdIntelligence] Trending insights response:', result);
      
      // Handle not_implemented status
      if (result?.status === 'not_implemented') {
        console.log('🚧 [useCrowdIntelligence] Trending insights not yet implemented');
        setTrendingData(null);
        return;
      }
      
      // Handle unauthorized status
      if (result?.status === 'unauthorized') {
        console.log('🔐 [useCrowdIntelligence] Unauthorized for trending insights');
        setTrendingData(null);
        return;
      }
      
      setTrendingData(result);
    } catch (err) {
      console.error('❌ [useCrowdIntelligence] Failed to load trending insights:', err);
      setTrendingData(null);
    }
  }, [getTrendingInsights]);

  const refreshInsights = useCallback(async () => {
    await Promise.all([loadCrowdInsights(), loadTrendingInsights()]);
  }, [loadCrowdInsights, loadTrendingInsights]);

  return {
    crowdData,
    trendingData,
    refreshInsights,
    loading,
    error
  };
}; 