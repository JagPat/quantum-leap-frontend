import { useState, useCallback, useRef } from 'react';
import { railwayAPI } from '@/api/railwayAPI';

// Custom hook for AI operations
export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  // AI Preferences
  const getAIPreferences = useCallback(async () => {
    return await makeRequest('/api/auth/ai/preferences');
  }, [makeRequest]);

  const updateAIPreferences = useCallback(async (preferences) => {
    return await makeRequest('/api/auth/ai/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
  }, [makeRequest]);

  const validateAPIKey = useCallback(async (provider, apiKey) => {
    return await makeRequest('/api/auth/ai/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, api_key: apiKey })
    });
  }, [makeRequest]);

  const clearAIPreferences = useCallback(async () => {
    return await makeRequest('/api/auth/ai/preferences', {
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
    cancelRequest,
    
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

export const usePortfolioCoPilot = () => {
  const { analyzePortfolio, getRebalanceRecommendations, loading, error } = useAI();
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const analyzePortfolioData = useCallback(async (portfolioData) => {
    try {
      const analysisData = await analyzePortfolio(portfolioData);
      setAnalysis(analysisData);
      
      const recommendationsData = await getRebalanceRecommendations(portfolioData);
      setRecommendations(recommendationsData);
      
      return { analysis: analysisData, recommendations: recommendationsData };
    } catch (err) {
      console.error('Portfolio analysis failed:', err);
      throw err;
    }
  }, [analyzePortfolio, getRebalanceRecommendations]);

  return {
    analysis,
    recommendations,
    analyzePortfolioData,
    loading,
    error
  };
};

export const useCrowdIntelligence = () => {
  const { getCrowdInsights, getTrendingInsights, loading, error } = useAI();
  const [crowdData, setCrowdData] = useState(null);
  const [trendingData, setTrendingData] = useState(null);

  const refreshInsights = useCallback(async () => {
    try {
      const [crowd, trending] = await Promise.all([
        getCrowdInsights(),
        getTrendingInsights()
      ]);
      setCrowdData(crowd);
      setTrendingData(trending);
    } catch (err) {
      console.error('Failed to refresh insights:', err);
    }
  }, [getCrowdInsights, getTrendingInsights]);

  return {
    crowdData,
    trendingData,
    refreshInsights,
    loading,
    error
  };
}; 