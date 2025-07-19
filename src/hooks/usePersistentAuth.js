import { useState, useEffect, useCallback } from 'react';
import { railwayAPI } from '@/api/railwayAPI';

/**
 * Persistent Authentication Hook
 * Automatically recovers user sessions and maintains connection state
 */
export const usePersistentAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastChecked, setLastChecked] = useState(null);

  // Load and validate stored authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 [usePersistentAuth] Initializing authentication...');
        
        // Get stored broker configuration
        const storedConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
        const activeConfig = storedConfigs.find(config => 
          config.is_connected && 
          config.access_token && 
          config.user_data?.user_id
        );

        if (!activeConfig) {
          console.log('🔐 [usePersistentAuth] No stored authentication found');
          setIsAuthenticated(false);
          setUserData(null);
          setConnectionStatus('disconnected');
          setIsLoading(false);
          return;
        }

        console.log('🔐 [usePersistentAuth] Found stored authentication for user:', activeConfig.user_data.user_id);
        
        // Validate the stored session with backend
        const isValid = await validateStoredSession(activeConfig);
        
        if (isValid) {
          console.log('✅ [usePersistentAuth] Stored session is valid');
          setIsAuthenticated(true);
          setUserData(activeConfig.user_data);
          setConnectionStatus('connected');
          
          // Update the stored config to reflect current status
          const updatedConfigs = storedConfigs.map(config => 
            config.id === activeConfig.id 
              ? { ...config, is_connected: true, last_validated: new Date().toISOString() }
              : config
          );
          localStorage.setItem('brokerConfigs', JSON.stringify(updatedConfigs));
        } else {
          console.log('❌ [usePersistentAuth] Stored session is invalid, clearing...');
          // Clear invalid session
          const updatedConfigs = storedConfigs.map(config => 
            config.id === activeConfig.id 
              ? { ...config, is_connected: false, access_token: null }
              : config
          );
          localStorage.setItem('brokerConfigs', JSON.stringify(updatedConfigs));
          
          setIsAuthenticated(false);
          setUserData(null);
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        console.error('❌ [usePersistentAuth] Error initializing authentication:', error);
        setIsAuthenticated(false);
        setUserData(null);
        setConnectionStatus('error');
      } finally {
        setIsLoading(false);
        setLastChecked(new Date().toISOString());
      }
    };

    initializeAuth();
  }, []);

  // Validate stored session with backend
  const validateStoredSession = async (config) => {
    try {
      console.log('🔍 [usePersistentAuth] Validating session with backend...');
      
      const response = await railwayAPI.request('/broker/status', {
        method: 'GET',
        headers: {
          'X-User-ID': config.user_data.user_id,
          'Authorization': `token ${config.api_key}:${config.access_token}`
        }
      });

      const isValid = response.status === 'success' && response.data?.is_connected;
      console.log('🔍 [usePersistentAuth] Backend validation result:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('❌ [usePersistentAuth] Session validation failed:', error);
      return false;
    }
  };

  // Periodic session validation
  useEffect(() => {
    if (!isAuthenticated || !userData) return;

    const validateInterval = setInterval(async () => {
      try {
        console.log('🔄 [usePersistentAuth] Periodic session validation...');
        
        const storedConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
        const activeConfig = storedConfigs.find(config => 
          config.is_connected && 
          config.user_data?.user_id === userData.user_id
        );

        if (!activeConfig) {
          console.log('❌ [usePersistentAuth] Active config not found during validation');
          setIsAuthenticated(false);
          setUserData(null);
          setConnectionStatus('disconnected');
          return;
        }

        const isValid = await validateStoredSession(activeConfig);
        
        if (!isValid) {
          console.log('❌ [usePersistentAuth] Session became invalid during validation');
          setIsAuthenticated(false);
          setUserData(null);
          setConnectionStatus('disconnected');
          
          // Update stored config
          const updatedConfigs = storedConfigs.map(config => 
            config.id === activeConfig.id 
              ? { ...config, is_connected: false, access_token: null }
              : config
          );
          localStorage.setItem('brokerConfigs', JSON.stringify(updatedConfigs));
        } else {
          setConnectionStatus('connected');
          setLastChecked(new Date().toISOString());
        }
      } catch (error) {
        console.error('❌ [usePersistentAuth] Periodic validation failed:', error);
        setConnectionStatus('error');
      }
    }, 5 * 60 * 1000); // Validate every 5 minutes

    return () => clearInterval(validateInterval);
  }, [isAuthenticated, userData]);

  // Manual session refresh
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [usePersistentAuth] Manual session refresh...');
      
      const storedConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = storedConfigs.find(config => 
        config.is_connected && 
        config.access_token && 
        config.user_data?.user_id
      );

      if (!activeConfig) {
        console.log('❌ [usePersistentAuth] No active config for manual refresh');
        setIsAuthenticated(false);
        setUserData(null);
        setConnectionStatus('disconnected');
        return;
      }

      const isValid = await validateStoredSession(activeConfig);
      
      if (isValid) {
        setIsAuthenticated(true);
        setUserData(activeConfig.user_data);
        setConnectionStatus('connected');
        setLastChecked(new Date().toISOString());
      } else {
        setIsAuthenticated(false);
        setUserData(null);
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ [usePersistentAuth] Manual refresh failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    console.log('🚪 [usePersistentAuth] Logging out...');
    
    // Clear stored authentication
    const storedConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
    const updatedConfigs = storedConfigs.map(config => ({
      ...config,
      is_connected: false,
      access_token: null,
      user_data: null
    }));
    localStorage.setItem('brokerConfigs', JSON.stringify(updatedConfigs));
    
    setIsAuthenticated(false);
    setUserData(null);
    setConnectionStatus('disconnected');
    setLastChecked(new Date().toISOString());
  }, []);

  return {
    isAuthenticated,
    userData,
    isLoading,
    connectionStatus,
    lastChecked,
    refreshSession,
    logout
  };
}; 