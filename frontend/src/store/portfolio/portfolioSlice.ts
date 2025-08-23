import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  PortfolioData, 
  Holding, 
  PerformanceData, 
  AIAnalysis, 
  AllocationData,
  TimeRange,
  PortfolioError 
} from '../../types/portfolio';
import { portfolioService } from '../../services/portfolioService';

// Async thunks for portfolio operations
export const fetchPortfolio = createAsyncThunk(
  'portfolio/fetchPortfolio',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await portfolioService.getLatestPortfolio(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchLivePortfolio = createAsyncThunk(
  'portfolio/fetchLivePortfolio',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await portfolioService.fetchLivePortfolio(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchPortfolioPerformance = createAsyncThunk(
  'portfolio/fetchPerformance',
  async ({ userId, timeRange }: { userId: string; timeRange: TimeRange }, { rejectWithValue }) => {
    try {
      return await portfolioService.getPortfolioPerformance(userId, timeRange);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchHoldings = createAsyncThunk(
  'portfolio/fetchHoldings',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await portfolioService.getHoldings(userId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const analyzePortfolio = createAsyncThunk(
  'portfolio/analyzePortfolio',
  async ({ userId, portfolioData }: { userId: string; portfolioData: PortfolioData }, { rejectWithValue }) => {
    try {
      return await portfolioService.analyzePortfolio(userId, portfolioData);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Portfolio state interface
interface PortfolioState {
  // Data
  currentPortfolio: PortfolioData | null;
  holdings: Holding[];
  performance: Record<TimeRange, PerformanceData | null>;
  allocation: AllocationData | null;
  aiAnalysis: AIAnalysis | null;
  
  // Loading states
  loading: {
    portfolio: boolean;
    livePortfolio: boolean;
    holdings: boolean;
    performance: Record<TimeRange, boolean>;
    allocation: boolean;
    aiAnalysis: boolean;
  };
  
  // Error states
  errors: {
    portfolio: PortfolioError | null;
    holdings: PortfolioError | null;
    performance: Record<TimeRange, PortfolioError | null>;
    allocation: PortfolioError | null;
    aiAnalysis: PortfolioError | null;
  };
  
  // UI state
  selectedTimeRange: TimeRange;
  realTimeEnabled: boolean;
  lastUpdated: string | null;
  autoRefreshInterval: number;
}

// Initial state
const initialState: PortfolioState = {
  // Data
  currentPortfolio: null,
  holdings: [],
  performance: {
    '1D': null,
    '1W': null,
    '1M': null,
    '3M': null,
    '6M': null,
    '1Y': null,
    'ALL': null,
  },
  allocation: null,
  aiAnalysis: null,
  
  // Loading states
  loading: {
    portfolio: false,
    livePortfolio: false,
    holdings: false,
    performance: {
      '1D': false,
      '1W': false,
      '1M': false,
      '3M': false,
      '6M': false,
      '1Y': false,
      'ALL': false,
    },
    allocation: false,
    aiAnalysis: false,
  },
  
  // Error states
  errors: {
    portfolio: null,
    holdings: null,
    performance: {
      '1D': null,
      '1W': null,
      '1M': null,
      '3M': null,
      '6M': null,
      '1Y': null,
      'ALL': null,
    },
    allocation: null,
    aiAnalysis: null,
  },
  
  // UI state
  selectedTimeRange: '1M',
  realTimeEnabled: true,
  lastUpdated: null,
  autoRefreshInterval: 30000, // 30 seconds
};

// Portfolio slice
const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    // UI actions
    setSelectedTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.selectedTimeRange = action.payload;
    },
    
    setRealTimeEnabled: (state, action: PayloadAction<boolean>) => {
      state.realTimeEnabled = action.payload;
    },
    
    setAutoRefreshInterval: (state, action: PayloadAction<number>) => {
      state.autoRefreshInterval = action.payload;
    },
    
    // Clear errors
    clearPortfolioError: (state) => {
      state.errors.portfolio = null;
    },
    
    clearHoldingsError: (state) => {
      state.errors.holdings = null;
    },
    
    clearPerformanceError: (state, action: PayloadAction<TimeRange>) => {
      state.errors.performance[action.payload] = null;
    },
    
    clearAIAnalysisError: (state) => {
      state.errors.aiAnalysis = null;
    },
    
    // Clear all errors
    clearAllErrors: (state) => {
      state.errors = initialState.errors;
    },
    
    // Update last updated timestamp
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    
    // Reset portfolio state
    resetPortfolioState: (state) => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Portfolio
    builder
      .addCase(fetchPortfolio.pending, (state) => {
        state.loading.portfolio = true;
        state.errors.portfolio = null;
      })
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        state.loading.portfolio = false;
        state.currentPortfolio = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchPortfolio.rejected, (state, action) => {
        state.loading.portfolio = false;
        state.errors.portfolio = action.payload as PortfolioError;
      });
    
    // Fetch Live Portfolio
    builder
      .addCase(fetchLivePortfolio.pending, (state) => {
        state.loading.livePortfolio = true;
        state.errors.portfolio = null;
      })
      .addCase(fetchLivePortfolio.fulfilled, (state, action) => {
        state.loading.livePortfolio = false;
        state.currentPortfolio = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchLivePortfolio.rejected, (state, action) => {
        state.loading.livePortfolio = false;
        state.errors.portfolio = action.payload as PortfolioError;
      });
    
    // Fetch Performance
    builder
      .addCase(fetchPortfolioPerformance.pending, (state, action) => {
        const timeRange = action.meta.arg.timeRange;
        state.loading.performance[timeRange] = true;
        state.errors.performance[timeRange] = null;
      })
      .addCase(fetchPortfolioPerformance.fulfilled, (state, action) => {
        const timeRange = action.meta.arg.timeRange;
        state.loading.performance[timeRange] = false;
        state.performance[timeRange] = action.payload;
      })
      .addCase(fetchPortfolioPerformance.rejected, (state, action) => {
        const timeRange = action.meta.arg.timeRange;
        state.loading.performance[timeRange] = false;
        state.errors.performance[timeRange] = action.payload as PortfolioError;
      });
    
    // Fetch Holdings
    builder
      .addCase(fetchHoldings.pending, (state) => {
        state.loading.holdings = true;
        state.errors.holdings = null;
      })
      .addCase(fetchHoldings.fulfilled, (state, action) => {
        state.loading.holdings = false;
        state.holdings = action.payload;
      })
      .addCase(fetchHoldings.rejected, (state, action) => {
        state.loading.holdings = false;
        state.errors.holdings = action.payload as PortfolioError;
      });
    
    // Analyze Portfolio
    builder
      .addCase(analyzePortfolio.pending, (state) => {
        state.loading.aiAnalysis = true;
        state.errors.aiAnalysis = null;
      })
      .addCase(analyzePortfolio.fulfilled, (state, action) => {
        state.loading.aiAnalysis = false;
        state.aiAnalysis = action.payload;
      })
      .addCase(analyzePortfolio.rejected, (state, action) => {
        state.loading.aiAnalysis = false;
        state.errors.aiAnalysis = action.payload as PortfolioError;
      });
  },
});

// Export actions
export const {
  setSelectedTimeRange,
  setRealTimeEnabled,
  setAutoRefreshInterval,
  clearPortfolioError,
  clearHoldingsError,
  clearPerformanceError,
  clearAIAnalysisError,
  clearAllErrors,
  updateLastUpdated,
  resetPortfolioState,
} = portfolioSlice.actions;

// Export reducer
export default portfolioSlice.reducer;