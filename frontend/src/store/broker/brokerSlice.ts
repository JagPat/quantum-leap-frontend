import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types for broker integration
export interface BrokerConfig {
  id: string;
  userId: string;
  brokerName: string;
  apiKey: string;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  tokenStatus?: TokenStatus;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired';
  message: string;
  lastChecked: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface TokenStatus {
  status: 'no_token' | 'valid' | 'expiring_soon' | 'expired' | 'error';
  expiresAt?: string;
}

export interface OAuthFlow {
  configId: string;
  oauthUrl: string;
  state: string;
  redirectUri: string;
  isActive: boolean;
  expiresAt: string;
}

export interface BrokerError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Async thunks for broker operations
export const fetchBrokerConfigs = createAsyncThunk(
  'broker/fetchConfigs',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/modules/auth/broker/configs?user_id=${userId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch broker configurations');
      }
      
      return result.data;
    } catch (error: any) {
      return rejectWithValue({
        code: 'FETCH_CONFIGS_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const createBrokerConfig = createAsyncThunk(
  'broker/createConfig',
  async (configData: { userId: string; apiKey: string; apiSecret: string; brokerName?: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/modules/auth/broker/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: configData.userId,
          api_key: configData.apiKey,
          api_secret: configData.apiSecret,
          broker_name: configData.brokerName || 'zerodha'
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create broker configuration');
      }
      
      return result.data;
    } catch (error: any) {
      return rejectWithValue({
        code: 'CREATE_CONFIG_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const setupOAuth = createAsyncThunk(
  'broker/setupOAuth',
  async (oauthData: { apiKey: string; apiSecret: string; userId: string; frontendUrl?: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/modules/auth/broker/setup-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: oauthData.apiKey,
          api_secret: oauthData.apiSecret,
          user_id: oauthData.userId,
          frontend_url: oauthData.frontendUrl || window.location.origin
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'OAuth setup failed');
      }
      
      return result.data;
    } catch (error: any) {
      return rejectWithValue({
        code: 'OAUTH_SETUP_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const handleOAuthCallback = createAsyncThunk(
  'broker/handleCallback',
  async (callbackData: { requestToken: string; state: string; configId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/modules/auth/broker/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_token: callbackData.requestToken,
          state: callbackData.state,
          config_id: callbackData.configId
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'OAuth callback failed');
      }
      
      return result.data;
    } catch (error: any) {
      return rejectWithValue({
        code: 'OAUTH_CALLBACK_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const refreshTokens = createAsyncThunk(
  'broker/refreshTokens',
  async (configId: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/modules/auth/broker/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_id: configId
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Token refresh failed');
      }
      
      return { configId, message: result.message };
    } catch (error: any) {
      return rejectWithValue({
        code: 'TOKEN_REFRESH_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const disconnectBroker = createAsyncThunk(
  'broker/disconnect',
  async (configId: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/modules/auth/broker/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_id: configId
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Disconnect failed');
      }
      
      return { configId, message: result.message };
    } catch (error: any) {
      return rejectWithValue({
        code: 'DISCONNECT_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const checkConnectionStatus = createAsyncThunk(
  'broker/checkStatus',
  async (params: { configId?: string; userId?: string }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.configId) queryParams.append('config_id', params.configId);
      if (params.userId) queryParams.append('user_id', params.userId);
      
      const response = await fetch(`/api/modules/auth/broker/status?${queryParams}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Status check failed');
      }
      
      return result.data;
    } catch (error: any) {
      return rejectWithValue({
        code: 'STATUS_CHECK_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export const deleteBrokerConfig = createAsyncThunk(
  'broker/deleteConfig',
  async (params: { configId: string; userId: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/modules/auth/broker/configs/${params.configId}?user_id=${params.userId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }
      
      return { configId: params.configId, message: result.message };
    } catch (error: any) {
      return rejectWithValue({
        code: 'DELETE_CONFIG_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Broker state interface
interface BrokerState {
  // Data
  configs: BrokerConfig[];
  activeConfig: BrokerConfig | null;
  oauthFlow: OAuthFlow | null;
  
  // Loading states
  loading: {
    configs: boolean;
    createConfig: boolean;
    setupOAuth: boolean;
    callback: boolean;
    refreshTokens: boolean;
    disconnect: boolean;
    status: boolean;
    deleteConfig: boolean;
  };
  
  // Error states
  errors: {
    configs: BrokerError | null;
    createConfig: BrokerError | null;
    setupOAuth: BrokerError | null;
    callback: BrokerError | null;
    refreshTokens: BrokerError | null;
    disconnect: BrokerError | null;
    status: BrokerError | null;
    deleteConfig: BrokerError | null;
  };
  
  // UI state
  selectedConfigId: string | null;
  showSetupModal: boolean;
  autoStatusCheck: boolean;
  statusCheckInterval: number;
  lastUpdated: string | null;
}

// Initial state
const initialState: BrokerState = {
  // Data
  configs: [],
  activeConfig: null,
  oauthFlow: null,
  
  // Loading states
  loading: {
    configs: false,
    createConfig: false,
    setupOAuth: false,
    callback: false,
    refreshTokens: false,
    disconnect: false,
    status: false,
    deleteConfig: false,
  },
  
  // Error states
  errors: {
    configs: null,
    createConfig: null,
    setupOAuth: null,
    callback: null,
    refreshTokens: null,
    disconnect: null,
    status: null,
    deleteConfig: null,
  },
  
  // UI state
  selectedConfigId: null,
  showSetupModal: false,
  autoStatusCheck: true,
  statusCheckInterval: 60000, // 1 minute
  lastUpdated: null,
};

// Broker slice
const brokerSlice = createSlice({
  name: 'broker',
  initialState,
  reducers: {
    // UI actions
    setSelectedConfig: (state, action: PayloadAction<string | null>) => {
      state.selectedConfigId = action.payload;
      state.activeConfig = action.payload 
        ? state.configs.find(config => config.id === action.payload) || null
        : null;
    },
    
    setShowSetupModal: (state, action: PayloadAction<boolean>) => {
      state.showSetupModal = action.payload;
    },
    
    setAutoStatusCheck: (state, action: PayloadAction<boolean>) => {
      state.autoStatusCheck = action.payload;
    },
    
    setStatusCheckInterval: (state, action: PayloadAction<number>) => {
      state.statusCheckInterval = action.payload;
    },
    
    // OAuth flow management
    clearOAuthFlow: (state) => {
      state.oauthFlow = null;
    },
    
    // Error management
    clearError: (state, action: PayloadAction<keyof BrokerState['errors']>) => {
      state.errors[action.payload] = null;
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key as keyof BrokerState['errors']] = null;
      });
    },
    
    // Update timestamps
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    
    // Reset state
    resetBrokerState: () => initialState,
    
    // Update config status locally (for real-time updates)
    updateConfigStatus: (state, action: PayloadAction<{ configId: string; status: ConnectionStatus; tokenStatus?: TokenStatus }>) => {
      const config = state.configs.find(c => c.id === action.payload.configId);
      if (config) {
        config.connectionStatus = action.payload.status;
        config.isConnected = action.payload.status.state === 'connected';
        if (action.payload.tokenStatus) {
          config.tokenStatus = action.payload.tokenStatus;
        }
        
        // Update active config if it matches
        if (state.activeConfig?.id === action.payload.configId) {
          state.activeConfig = { ...config };
        }
      }
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Configs
    builder
      .addCase(fetchBrokerConfigs.pending, (state) => {
        state.loading.configs = true;
        state.errors.configs = null;
      })
      .addCase(fetchBrokerConfigs.fulfilled, (state, action) => {
        state.loading.configs = false;
        state.configs = action.payload;
        state.lastUpdated = new Date().toISOString();
        
        // Update active config if selected
        if (state.selectedConfigId) {
          state.activeConfig = state.configs.find(config => config.id === state.selectedConfigId) || null;
        }
      })
      .addCase(fetchBrokerConfigs.rejected, (state, action) => {
        state.loading.configs = false;
        state.errors.configs = action.payload as BrokerError;
      });
    
    // Create Config
    builder
      .addCase(createBrokerConfig.pending, (state) => {
        state.loading.createConfig = true;
        state.errors.createConfig = null;
      })
      .addCase(createBrokerConfig.fulfilled, (state, action) => {
        state.loading.createConfig = false;
        
        // Update or add config
        const existingIndex = state.configs.findIndex(config => config.id === action.payload.id);
        if (existingIndex >= 0) {
          state.configs[existingIndex] = action.payload;
        } else {
          state.configs.push(action.payload);
        }
        
        // Set as active config
        state.activeConfig = action.payload;
        state.selectedConfigId = action.payload.id;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createBrokerConfig.rejected, (state, action) => {
        state.loading.createConfig = false;
        state.errors.createConfig = action.payload as BrokerError;
      });
    
    // Setup OAuth
    builder
      .addCase(setupOAuth.pending, (state) => {
        state.loading.setupOAuth = true;
        state.errors.setupOAuth = null;
      })
      .addCase(setupOAuth.fulfilled, (state, action) => {
        state.loading.setupOAuth = false;
        
        // Store OAuth flow data
        state.oauthFlow = {
          configId: action.payload.config_id,
          oauthUrl: action.payload.oauth_url,
          state: action.payload.state,
          redirectUri: action.payload.redirect_uri,
          isActive: true,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        };
      })
      .addCase(setupOAuth.rejected, (state, action) => {
        state.loading.setupOAuth = false;
        state.errors.setupOAuth = action.payload as BrokerError;
        state.oauthFlow = null;
      });
    
    // Handle Callback
    builder
      .addCase(handleOAuthCallback.pending, (state) => {
        state.loading.callback = true;
        state.errors.callback = null;
      })
      .addCase(handleOAuthCallback.fulfilled, (state, action) => {
        state.loading.callback = false;
        state.oauthFlow = null;
        
        // Update config status to connected
        if (state.activeConfig) {
          state.activeConfig.isConnected = true;
          state.activeConfig.connectionStatus = {
            state: 'connected',
            message: 'Successfully connected to broker',
            lastChecked: new Date().toISOString()
          };
          
          // Update in configs array
          const configIndex = state.configs.findIndex(c => c.id === state.activeConfig?.id);
          if (configIndex >= 0) {
            state.configs[configIndex] = { ...state.activeConfig };
          }
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(handleOAuthCallback.rejected, (state, action) => {
        state.loading.callback = false;
        state.errors.callback = action.payload as BrokerError;
        state.oauthFlow = null;
      });
    
    // Refresh Tokens
    builder
      .addCase(refreshTokens.pending, (state) => {
        state.loading.refreshTokens = true;
        state.errors.refreshTokens = null;
      })
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.loading.refreshTokens = false;
        
        // Update config status
        const config = state.configs.find(c => c.id === action.payload.configId);
        if (config) {
          config.connectionStatus = {
            state: 'connected',
            message: 'Tokens refreshed successfully',
            lastChecked: new Date().toISOString()
          };
          config.isConnected = true;
          
          if (state.activeConfig?.id === action.payload.configId) {
            state.activeConfig = { ...config };
          }
        }
      })
      .addCase(refreshTokens.rejected, (state, action) => {
        state.loading.refreshTokens = false;
        state.errors.refreshTokens = action.payload as BrokerError;
      });
    
    // Disconnect
    builder
      .addCase(disconnectBroker.pending, (state) => {
        state.loading.disconnect = true;
        state.errors.disconnect = null;
      })
      .addCase(disconnectBroker.fulfilled, (state, action) => {
        state.loading.disconnect = false;
        
        // Update config status
        const config = state.configs.find(c => c.id === action.payload.configId);
        if (config) {
          config.connectionStatus = {
            state: 'disconnected',
            message: 'Disconnected successfully',
            lastChecked: new Date().toISOString()
          };
          config.isConnected = false;
          
          if (state.activeConfig?.id === action.payload.configId) {
            state.activeConfig = { ...config };
          }
        }
      })
      .addCase(disconnectBroker.rejected, (state, action) => {
        state.loading.disconnect = false;
        state.errors.disconnect = action.payload as BrokerError;
      });
    
    // Check Status
    builder
      .addCase(checkConnectionStatus.pending, (state) => {
        state.loading.status = true;
        state.errors.status = null;
      })
      .addCase(checkConnectionStatus.fulfilled, (state, action) => {
        state.loading.status = false;
        
        if (action.payload.configId) {
          // Update specific config
          const config = state.configs.find(c => c.id === action.payload.configId);
          if (config) {
            config.connectionStatus = action.payload.connectionStatus;
            config.isConnected = action.payload.isConnected;
            if (action.payload.tokenStatus) {
              config.tokenStatus = action.payload.tokenStatus;
            }
            
            if (state.activeConfig?.id === action.payload.configId) {
              state.activeConfig = { ...config };
            }
          }
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(checkConnectionStatus.rejected, (state, action) => {
        state.loading.status = false;
        state.errors.status = action.payload as BrokerError;
      });
    
    // Delete Config
    builder
      .addCase(deleteBrokerConfig.pending, (state) => {
        state.loading.deleteConfig = true;
        state.errors.deleteConfig = null;
      })
      .addCase(deleteBrokerConfig.fulfilled, (state, action) => {
        state.loading.deleteConfig = false;
        
        // Remove config from array
        state.configs = state.configs.filter(config => config.id !== action.payload.configId);
        
        // Clear active config if it was deleted
        if (state.activeConfig?.id === action.payload.configId) {
          state.activeConfig = null;
          state.selectedConfigId = null;
        }
        
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteBrokerConfig.rejected, (state, action) => {
        state.loading.deleteConfig = false;
        state.errors.deleteConfig = action.payload as BrokerError;
      });
  },
});

// Export actions
export const {
  setSelectedConfig,
  setShowSetupModal,
  setAutoStatusCheck,
  setStatusCheckInterval,
  clearOAuthFlow,
  clearError,
  clearAllErrors,
  updateLastUpdated,
  resetBrokerState,
  updateConfigStatus,
} = brokerSlice.actions;

// Export slice
export { brokerSlice };

// Export reducer
export default brokerSlice.reducer;