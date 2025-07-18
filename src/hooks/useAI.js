import { useState, useCallback, useRef } from 'react';
import { railwayAPI } from '@/api/railwayAPI';

// Custom hook for AI operations
export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const abortControllerRef = useRef(null);

  // Generic request handler with abort support
  const makeRequest = useCallback(async (endpoint, options = {}) => {
    try {
      setLoading(true);
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

      if (response.status === 'error') {
        throw new Error(response.message || 'AI request failed');
      }

      return response.data;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
        return null;
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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
      console.error('Error sending assistant message:', err);
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
  }, [makeRequest]);

  const deleteThread = useCallback(async (threadId) => {
    // Thread management not implemented in current backend
    return {
      status: 'not_implemented',
      message: 'Thread management not yet implemented'
    };
  }, [makeRequest]);

  const getUserThreadId = useCallback(async () => {
    // Thread management not implemented in current backend
    return {
      status: 'not_implemented',
      thread_id: null,
      message: 'Thread management not yet implemented'
    };
  }, [makeRequest]);

  const clearUserThread = useCallback(async () => {
    // Thread management not implemented in current backend
    setThreadId(null);
    return {
      status: 'not_implemented',
      message: 'Thread management not yet implemented'
    };
  }, [makeRequest]);

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
    return await makeRequest('/api/ai/strategy/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  }, [makeRequest]);

  const getStrategies = useCallback(async () => {
    return await makeRequest('/api/ai/strategy/list');
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
      body: JSON.stringify({ portfolio_data: portfolioData })
    });
  }, [makeRequest]);

  const getRebalanceRecommendations = useCallback(async (portfolioData) => {
    return await makeRequest('/api/ai/copilot/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio_data: portfolioData })
    });
  }, [makeRequest]);

  // System Health
  const getAIStatus = useCallback(async () => {
    return await makeRequest('/api/ai/status');
  }, [makeRequest]);

  const getAIHealth = useCallback(async () => {
    return await makeRequest('/api/ai/health');
  }, [makeRequest]);

  // Cancel ongoing requests
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    threadId,
    cancelRequest,
    
    // OpenAI Assistants API
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
    
    // Strategy
    generateStrategy,
    getStrategies,
    getStrategy,
    
    // Analysis
    generateMarketAnalysis,
    generateTechnicalAnalysis,
    generateSentimentAnalysis,
    
    // Signals
    getSignals,
    
    // Feedback
    recordTradeOutcome,
    getLearningInsights,
    
    // Analytics
    getStrategyClustering,
    getStrategyAnalytics,
    
    // Crowd Intelligence
    getCrowdInsights,
    getTrendingInsights,
    
    // Portfolio Co-Pilot
    analyzePortfolio,
    getRebalanceRecommendations,
    
    // System
    getAIStatus,
    getAIHealth
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
      setAssistantStatus(status);
    } catch (err) {
      console.error('Failed to load assistant status:', err);
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
  const [crowdInsights, setCrowdInsights] = useState([]);
  const [trendingInsights, setTrendingInsights] = useState([]);

  const loadCrowdInsights = useCallback(async () => {
    try {
      const result = await getCrowdInsights();
      setCrowdInsights(result?.insights || []);
    } catch (err) {
      console.error('Failed to load crowd insights:', err);
    }
  }, [getCrowdInsights]);

  const loadTrendingInsights = useCallback(async () => {
    try {
      const result = await getTrendingInsights();
      setTrendingInsights(result?.insights || []);
    } catch (err) {
      console.error('Failed to load trending insights:', err);
    }
  }, [getTrendingInsights]);

  return {
    crowdInsights,
    trendingInsights,
    loadCrowdInsights,
    loadTrendingInsights,
    loading,
    error
  };
}; 