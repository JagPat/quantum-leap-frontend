import { useState, useEffect, useCallback, useRef } from 'react';
import { railwayAPI } from '@/api/railwayAPI';
import { useAIStatus } from '@/contexts/AIStatusContext';

/**
 * Main AI hook that provides access to AI functionality
 * Uses global AI status context to prevent duplicate requests
 */
export const useAI = () => {
  // Use the global AI status context instead of local state
  const { aiStatus, aiPreferences, isLoading, error, refreshAIStatus } = useAIStatus();
  const [threadId, setThreadId] = useState(null);
  const abortControllerRef = useRef(null);
  const loadingRef = useRef(false);

  // Enhanced request handler with comprehensive response handling
  const makeRequest = useCallback(async (endpoint, options = {}) => {
    try {
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
      throw err;
    } finally {
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

  const updateStrategy = useCallback(async (strategyId, updates) => {
    return await makeRequest(`/api/ai/strategy/${strategyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  }, [makeRequest]);

  const deleteStrategy = useCallback(async (strategyId) => {
    return await makeRequest(`/api/ai/strategy/${strategyId}`, {
      method: 'DELETE'
    });
  }, [makeRequest]);

  // Trading Signals
  const getSignals = useCallback(async () => {
    return await makeRequest('/api/ai/signals');
  }, [makeRequest]);

  const generateSignal = useCallback(async (request) => {
    return await makeRequest('/api/ai/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  // Portfolio Analysis
  const analyzePortfolio = useCallback(async (request) => {
    return await makeRequest('/api/ai/copilot/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const getPortfolioRecommendations = useCallback(async () => {
    return await makeRequest('/api/ai/copilot/recommendations');
  }, [makeRequest]);

  // Market Analysis
  const analyzeMarket = useCallback(async (request) => {
    return await makeRequest('/api/ai/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const getMarketInsights = useCallback(async () => {
    return await makeRequest('/api/ai/insights/trending');
  }, [makeRequest]);

  // Crowd Intelligence
  const getCrowdInsights = useCallback(async () => {
    return await makeRequest('/api/ai/insights/crowd');
  }, [makeRequest]);

  // Strategy Analytics
  const getStrategyAnalytics = useCallback(async (strategyId) => {
    return await makeRequest(`/api/ai/analytics/strategy/${strategyId}`);
  }, [makeRequest]);

  const getStrategyClustering = useCallback(async () => {
    return await makeRequest('/api/ai/clustering/strategies');
  }, [makeRequest]);

  // Performance Analytics
  const getPerformanceAnalytics = useCallback(async () => {
    return await makeRequest('/api/ai/analytics/performance');
  }, [makeRequest]);

  // Feedback and Learning
  const recordTradeOutcome = useCallback(async (feedback) => {
    return await makeRequest('/api/ai/feedback/outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });
  }, [makeRequest]);

  const getLearningInsights = useCallback(async () => {
    return await makeRequest('/api/ai/feedback/insights');
  }, [makeRequest]);

  // Initialize thread on mount
  useEffect(() => {
    initializeThread();
  }, [initializeThread]);

  return {
    // Status and preferences from global context
    aiStatus,
    aiPreferences,
    isLoading,
    error,
    refreshAIStatus,
    
    // Thread management
    threadId,
    sendAssistantMessage,
    getAssistantStatus,
    getThreadMessages,
    deleteThread,
    getUserThreadId,
    clearUserThread,
    initializeThread,
    
    // AI Preferences
    getAIPreferences,
    updateAIPreferences,
    validateAPIKey,
    clearAIPreferences,
    
    // Strategy Generation
    generateStrategy,
    getStrategies,
    getStrategy,
    updateStrategy,
    deleteStrategy,
    
    // Trading Signals
    getSignals,
    generateSignal,
    
    // Portfolio Analysis
    analyzePortfolio,
    getPortfolioRecommendations,
    
    // Market Analysis
    analyzeMarket,
    getMarketInsights,
    
    // Crowd Intelligence
    getCrowdInsights,
    
    // Strategy Analytics
    getStrategyAnalytics,
    getStrategyClustering,
    
    // Performance Analytics
    getPerformanceAnalytics,
    
    // Feedback and Learning
    recordTradeOutcome,
    getLearningInsights
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