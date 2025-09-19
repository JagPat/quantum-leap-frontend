
import React, { useState, useEffect } from "react";
import { BrokerConfig as BaseBrokerConfig, ImportedPosition, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link as LinkIcon, 
  Download, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import BrokerSetup from "../components/broker/BrokerSetup";
import PortfolioImport from "../components/broker/PortfolioImport";
import { useToast } from "@/components/ui/use-toast";
import { railwayAPI } from "../api/railwayAPI"; // Import the API wrapper
import { config as deploymentConfig } from "@/config/deployment.js";

// CRITICAL FIX: Defensive import validation with fallback
const BrokerConfig = (() => {
  if (!BaseBrokerConfig) {
    console.error('❌ CRITICAL: BaseBrokerConfig is undefined');
    return null;
  }
  
  if (typeof BaseBrokerConfig.list !== 'function') {
    console.error('❌ CRITICAL: BaseBrokerConfig.list is not a function:', typeof BaseBrokerConfig.list);
    console.error('Available methods:', Object.keys(BaseBrokerConfig));
    return null;
  }
  
  console.log('✅ BrokerConfig import validated successfully');
  return BaseBrokerConfig;
})();

if (!BrokerConfig) {
  console.error('❌ FATAL: BrokerConfig validation failed. Creating fallback.');
}

export default function BrokerIntegration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brokerConfig, setBrokerConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [importedPositions, setImportedPositions] = useState([]);
  const [portfolio, setPortfolio] = useState(null); // Add state for portfolio data
  const [liveStatus, setLiveStatus] = useState({ 
    state: 'unknown', 
    message: 'Loading...', 
    lastChecked: null,
    backendConnected: false 
  });
  const [heartbeatInterval, setHeartbeatInterval] = useState(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);

  const getBackendBaseUrl = () => {
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL;
    const baseUrl = envUrl && envUrl.length > 0
      ? envUrl
      : (deploymentConfig?.urls?.backend || 'https://web-production-de0bc.up.railway.app');
    return baseUrl.replace(/\/$/, '');
  };

  useEffect(() => {
    loadBrokerConfig();
  }, []);

  // Enhanced heartbeat mechanism with smart status management
  useEffect(() => {
    if (!brokerConfig) return; // Add guard clause to prevent race conditions

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    const checkConnection = async () => {
      if (!brokerConfig?.is_connected || !brokerConfig?.access_token) {
        setLiveStatus(prev => ({ 
          ...prev, 
          state: 'disconnected', 
          message: 'Not connected to broker',
          lastChecked: new Date().toLocaleTimeString(),
          backendConnected: false 
        }));
        return;
      }

      console.log("🔄 Running heartbeat check...");
      
      try {
        // CRITICAL FIX: Ensure we have proper user_id - don't fallback to 'local_user'
        const userId = brokerConfig.user_data?.user_id;
        if (!userId) {
          console.error("❌ CRITICAL: No user_id found in brokerConfig.user_data:", brokerConfig.user_data);
          setLiveStatus(prev => ({ 
            ...prev,
            state: 'error', 
            message: 'Invalid configuration: Missing user ID. Please reconnect to broker.',
            lastChecked: new Date().toLocaleTimeString(),
            backendConnected: false
          }));
          return;
        }
        
        console.log("🔍 Checking backend status for user_id:", userId);
        
        // Check broker connection via Railway backend
        const response = await fetch(`${getBackendBaseUrl()}/api/modules/auth/broker/status?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        console.log("🔍 Heartbeat check result:", result);
        
        if (result.status === 'success' && result.data?.is_connected) {
          setLiveStatus(prev => ({ 
            ...prev,
            state: 'connected', 
            message: `Live connection verified at ${new Date().toLocaleTimeString()}`,
            lastChecked: new Date().toLocaleTimeString(),
            backendConnected: true
          }));
        } else {
          // Don't immediately disconnect - show warning but maintain local status
          setLiveStatus(prev => ({ 
            ...prev,
            state: 'connected_local', 
            message: `Connected (Local) - Backend reports: ${result.data?.message || 'Disconnected'}`,
            lastChecked: new Date().toLocaleTimeString(),
            backendConnected: false
          }));
          
          console.warn("⚠️ Backend reports disconnected but local config shows connected. Possible session sync issue.");
        }
      } catch (error) {
        console.error("Heartbeat check failed:", error);
        // Don't immediately disconnect on network errors
        setLiveStatus(prev => ({ 
          ...prev,
          state: prev.state.includes('connected') ? 'connected_local' : 'unknown',
          message: `Connected (Local) - Backend check failed: ${error.message.substring(0, 50)}...`,
          lastChecked: new Date().toLocaleTimeString(),
          backendConnected: false
        }));
      }
    };

    // Start periodic heartbeat only if user is connected
    if (brokerConfig?.is_connected) {
      console.log("🔄 Starting heartbeat monitoring for connected broker");
      setLiveStatus(prev => ({ 
        ...prev,
        state: 'connected', 
        message: 'Broker connected - monitoring live status...',
        lastChecked: new Date().toLocaleTimeString()
      }));
      
      // Initial check after 5 seconds, then every 60 seconds (less aggressive)
      const initialTimeout = setTimeout(checkConnection, 5000);
      const interval = setInterval(checkConnection, 60000); // Check every minute
      setHeartbeatInterval(interval);
      
      return () => {
        clearTimeout(initialTimeout);
        clearInterval(interval);
      };
    } else {
      setLiveStatus(prev => ({ 
        ...prev,
        state: brokerConfig ? 'disconnected' : 'unknown', 
        message: brokerConfig ? 'Not connected to broker' : 'Loading configuration...',
        lastChecked: new Date().toLocaleTimeString(),
        backendConnected: false
      }));
    }

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [brokerConfig, toast]);

  // Only allow import tab if truly connected (backend verified)
  useEffect(() => {
    if (!isLoading) {
      if (brokerConfig?.is_connected && liveStatus.backendConnected) {
        setActiveTab('import');
      } else {
        setActiveTab('setup');
      }
    }
  }, [brokerConfig, liveStatus.backendConnected, isLoading]);

  const handleFetchLivePortfolio = async () => {
    if (!brokerConfig?.user_data?.user_id) {
      toast({
        title: "Error",
        description: "User ID not found. Cannot fetch portfolio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await railwayAPI.fetchLivePortfolio(brokerConfig.user_data.user_id);
      if (response.status === 'success' && response.snapshot) {
        setPortfolio(response.snapshot);
        toast({
          title: "Success",
          description: "Live portfolio data fetched successfully.",
        });
      } else {
        throw new Error(response.message || "Failed to fetch portfolio.");
      }
    } catch (error) {
      toast({
        title: "Error fetching portfolio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadBrokerConfig = async () => {
    setIsLoading(true);
    try {
      // CRITICAL FIX: Enhanced defensive checks
      if (!BrokerConfig) {
        throw new Error('BrokerConfig is not available. Import validation failed.');
      }
      
      if (typeof BrokerConfig.list !== 'function') {
        console.error('❌ BrokerConfig methods available:', Object.keys(BrokerConfig));
        throw new Error(`BrokerConfig.list is not a function (type: ${typeof BrokerConfig.list}). Import may have failed.`);
      }
      
      console.log("🔍 [DEBUG] Calling BrokerConfig.list()...");
      const configs = await BrokerConfig.list();
      console.log("📋 Loaded broker configs:", configs);
      console.log("🔍 Debug - configs length:", configs?.length || 0);
      
      if (configs && configs.length > 0) {
        const currentConfig = configs[0];
        console.log("📋 Current broker config:", currentConfig);
        console.log("🔍 Debug - is_connected value:", currentConfig.is_connected);
        console.log("🔍 Debug - access_token exists:", !!currentConfig.access_token);
        
        // If we have an access token, verify with backend
        if (currentConfig.access_token && currentConfig.user_data?.user_id) {
          console.log("🔍 Checking backend status for user:", currentConfig.user_data.user_id);
          try {
            const backendResponse = await fetch(`${getBackendBaseUrl()}/api/modules/auth/broker/status?user_id=${currentConfig.user_data.user_id}`);
            const backendResult = await backendResponse.json();
            console.log("🔍 Backend status response:", backendResult);
            
            if (backendResult.status === 'success' && backendResult.data?.is_connected) {
              // Update local config with backend confirmation
              const updatedConfig = {
                ...currentConfig,
                is_connected: true,
                connection_status: 'connected'
              };
              await BrokerConfig.update(currentConfig.id, updatedConfig);
              setBrokerConfig(updatedConfig);
              
              console.log("✅ Backend confirms connection - updating to CONNECTED");
              setActiveTab('import');
              setLiveStatus(prev => ({ 
                ...prev,
                state: 'connected', 
                message: 'Connected and verified with backend',
                lastChecked: new Date().toLocaleTimeString(),
                backendConnected: true,
                last_successful_connection: backendResult.data.last_successful_connection,
                token_expiry: backendResult.data.token_expiry,
                last_error: backendResult.data.last_error
              }));
            } else {
              // Backend says not connected
              const updatedConfig = {
                ...currentConfig,
                is_connected: false,
                connection_status: 'disconnected'
              };
              await BrokerConfig.update(currentConfig.id, updatedConfig);
              setBrokerConfig(updatedConfig);
              
              console.log("❌ Backend reports disconnected - updating to DISCONNECTED");
              setLiveStatus(prev => ({ 
                ...prev,
                state: 'disconnected', 
                message: `Backend reports: ${backendResult.data?.message || 'Disconnected'}`,
                lastChecked: new Date().toLocaleTimeString(),
                backendConnected: false,
                last_successful_connection: backendResult.data?.last_successful_connection,
                token_expiry: backendResult.data?.token_expiry,
                last_error: backendResult.data?.last_error
              }));
            }
          } catch (backendError) {
            console.error("Error checking backend status:", backendError);
            // Keep local config but note backend unavailability
            setBrokerConfig(currentConfig);
            setLiveStatus(prev => ({ 
              ...prev,
              state: currentConfig.is_connected ? 'connected_local' : 'disconnected',
              message: `Connected (Local) - Backend unavailable: ${backendError.message}`,
              lastChecked: new Date().toLocaleTimeString(),
              backendConnected: false
            }));
          }
        } else if (currentConfig.access_token && !currentConfig.user_data?.user_id) {
          // CRITICAL: Config has access_token but missing user_data - likely a data corruption issue
          console.error("❌ CRITICAL: Found access_token but missing user_data.user_id");
          console.error("Config data:", currentConfig);
          
          // Force disconnect to clean up corrupted state
          const cleanConfig = {
            ...currentConfig,
            is_connected: false,
            access_token: '',
            connection_status: 'disconnected',
            error_message: 'Configuration corrupted: Missing user data. Please reconnect.'
          };
          await BrokerConfig.update(currentConfig.id, cleanConfig);
          setBrokerConfig(cleanConfig);
          
          setLiveStatus(prev => ({ 
            ...prev,
            state: 'error', 
            message: 'Configuration corrupted: Missing user data. Please reconnect to broker.',
            lastChecked: new Date().toLocaleTimeString(),
            backendConnected: false
          }));
          
          toast({
            title: "Configuration Error",
            description: "Broker configuration is corrupted. Please reconnect to your broker.",
            variant: "destructive",
          });
        } else {
          // No access token, definitely not connected
          setBrokerConfig(currentConfig);
          console.log("❌ No access token - setting to DISCONNECTED");
          setActiveTab('setup');
          setLiveStatus(prev => ({ 
            ...prev,
            state: 'disconnected', 
            message: 'No access token found',
            lastChecked: new Date().toLocaleTimeString(),
            backendConnected: false
          }));
        }
      } else {
        console.log("⚠️ No broker configs found - setting to UNKNOWN");
        setBrokerConfig(null);
        setLiveStatus(prev => ({ 
          ...prev,
          state: 'unknown', 
          message: 'No broker configuration found',
          lastChecked: new Date().toLocaleTimeString(),
          backendConnected: false
        }));
      }
      
      const positions = await ImportedPosition.list();
      setImportedPositions(positions);
    } catch (error) {
      console.error("Error loading broker config:", error);
      toast({
        title: "Error",
        description: `Failed to load broker configuration: ${error.message}`,
        variant: "destructive",
      });
      setLiveStatus(prev => ({ 
        ...prev,
        state: 'error', 
        message: `Error loading configuration: ${error.message}`,
        lastChecked: new Date().toLocaleTimeString(),
        backendConnected: false
      }));
    }
    setIsLoading(false);
  };

  const handleConfigSaved = async (configData) => {
    try {
      let savedConfig;
      if (brokerConfig) {
        savedConfig = await BrokerConfig.update(brokerConfig.id, configData);
      } else {
        savedConfig = await BrokerConfig.create(configData);
      }
      
      console.log("💾 Config saved:", savedConfig);
      setBrokerConfig(savedConfig);
      
      await User.updateMyUserData({
        broker_connected: configData.is_connected,
        broker_type: configData.broker_name
      });
      
      // Auto-switch to import tab if connected
      if (configData.is_connected) {
        setActiveTab('import');
        setLiveStatus(prev => ({ 
          ...prev,
          state: 'connected', 
          message: 'Successfully connected to broker!',
          lastChecked: new Date().toLocaleTimeString()
        }));
        toast({
          title: "Success",
          description: "Broker connected successfully!",
        });
      } else {
        setActiveTab('setup');
        setLiveStatus(prev => ({ 
          ...prev,
          state: 'disconnected', 
          message: 'Broker disconnected',
          lastChecked: new Date().toLocaleTimeString(),
          backendConnected: false
        }));
      }
    } catch (error) {
      console.error("Error saving broker config:", error);
      toast({
        title: "Error",
        description: `Failed to save broker configuration: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const onConnectionComplete = () => {
    // Force reload config after connection
    loadBrokerConfig();
  };

  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    await loadBrokerConfig();
  };

  const handleCheckBackendStatus = async () => {
    if (!brokerConfig?.access_token) {
      toast({
        title: "No Connection",
        description: "No active broker connection to check.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingBackend(true);
    
    try {
      // CRITICAL FIX: Ensure we have proper user_id - don't fallback to 'local_user'
      const userId = brokerConfig.user_data?.user_id;
      if (!userId) {
        throw new Error('Missing user ID in broker configuration. Please reconnect to broker.');
      }
      
      console.log("🔍 Manual backend check for user_id:", userId);
      
      const response = await fetch(`${getBackendBaseUrl()}/api/modules/auth/broker/status?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      console.log("🔍 Manual backend check result:", result);
      
      if (result.status === 'success') {
        const isBackendConnected = result.data?.is_connected || false;
        const backendMessage = result.data?.message || 'Unknown status';
        
        // Update local broker config state to reflect backend connection
        if (brokerConfig) {
          const updatedConfigs = configs.map(config => 
            config.id === brokerConfig.id 
              ? { ...config, is_connected: isBackendConnected, backend_status: isBackendConnected ? 'connected' : 'disconnected' }
              : config
          );
          localStorage.setItem('brokerConfigs', JSON.stringify(updatedConfigs));
          setBrokerConfig({ ...brokerConfig, is_connected: isBackendConnected, backend_status: isBackendConnected ? 'connected' : 'disconnected' });
        }
        
        setLiveStatus(prev => ({ 
          ...prev,
          state: isBackendConnected ? 'connected' : 'connected_local',
          message: isBackendConnected 
            ? `Backend confirms connection at ${new Date().toLocaleTimeString()}`
            : `Connected (Local) - Backend: ${backendMessage}`,
          lastChecked: new Date().toLocaleTimeString(),
          backendConnected: isBackendConnected,
          last_successful_connection: result.data?.last_successful_connection,
          token_expiry: result.data?.token_expiry,
          last_error: result.data?.last_error
        }));
        
        toast({
          title: isBackendConnected ? "Backend Connected" : "Backend Disconnected",
          description: isBackendConnected 
            ? "Backend confirms your broker connection is active"
            : `Backend reports: ${backendMessage}`,
          variant: isBackendConnected ? "default" : "destructive",
        });
      } else {
        throw new Error(result.error || 'Backend status check failed');
      }
    } catch (error) {
      console.error("Manual backend check failed:", error);
      setLiveStatus(prev => ({ 
        ...prev,
        state: 'connected_local',
        message: `Connected (Local) - Backend unavailable: ${error.message}`,
        lastChecked: new Date().toLocaleTimeString(),
        backendConnected: false
      }));
      
      toast({
        title: "Backend Check Failed",
        description: `Could not verify backend status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCheckingBackend(false);
    }
  };

  const handleImportComplete = async (selectedPositions) => {
    try {
      // Save selected positions to ImportedPosition
      for (const position of selectedPositions) {
        await ImportedPosition.create({
          symbol: position.symbol,
          quantity: position.quantity,
          price: position.price,
          source: brokerConfig.broker_name || 'Unknown'
        });
      }
      
      // Reload positions
      const positions = await ImportedPosition.list();
      setImportedPositions(positions);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${selectedPositions.length} positions.`,
      });
    } catch (error) {
      console.error("Error importing positions:", error);
      toast({
        title: "Import Error",
        description: "Failed to import some positions.",
        variant: "destructive",
      });
    }
  };

  const getConnectionStatus = () => {
    const { state, message, lastChecked, backendConnected } = liveStatus;
    console.log("🎨 Debug - getConnectionStatus called with state:", state, "message:", message);
    
    switch (state) {
      case 'connected':
        return {
          badge: <Badge className="bg-green-600 text-white">Connected</Badge>,
          icon: <Wifi className="h-4 w-4 text-green-600" />,
          message: backendConnected ? message : `${message} (Backend verified)`,
          color: 'text-green-600'
        };
      case 'connected_local':
        return {
          badge: <Badge className="bg-yellow-600 text-white">Connected (Local)</Badge>,
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          message: `${message}`,
          color: 'text-yellow-600'
        };
      case 'disconnected':
        return {
          badge: <Badge className="bg-red-600 text-white">Disconnected</Badge>,
          icon: <WifiOff className="h-4 w-4 text-red-600" />,
          message: message,
          color: 'text-red-600'
        };
      case 'checking':
        return {
          badge: <Badge className="bg-blue-600 text-white">Checking...</Badge>,
          icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />,
          message: message,
          color: 'text-blue-600'
        };
      case 'error':
        return {
          badge: <Badge className="bg-red-600 text-white">Error</Badge>,
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
          message: message,
          color: 'text-red-600'
        };
      default:
        return {
          badge: <Badge className="bg-gray-600 text-white">Unknown</Badge>,
          icon: <AlertTriangle className="h-4 w-4 text-gray-600" />,
          message: message,
          color: 'text-gray-600'
        };
    }
  };

  const status = getConnectionStatus();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading broker configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Broker Integration</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRefresh}
            className="text-slate-400 border-slate-600 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {brokerConfig?.is_connected && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCheckBackendStatus}
              disabled={isCheckingBackend}
              className="text-slate-400 border-slate-600 hover:bg-slate-800"
            >
              {isCheckingBackend ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              Check Backend
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.icon}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">Broker Status</h3>
                  {status.badge}
                </div>
                <p className={`text-sm ${status.color}`}>
                  {status.message}
                </p>
                {liveStatus.lastChecked && (
                  <p className="text-xs text-slate-500 mt-1">
                    Last checked: {liveStatus.lastChecked}
                  </p>
                )}
                {liveStatus.last_successful_connection && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last successful connection: {new Date(liveStatus.last_successful_connection).toLocaleString()}
                  </p>
                )}
                {liveStatus.token_expiry && (
                  <p className="text-xs text-slate-400 mt-1">
                    Token expiry: {new Date(liveStatus.token_expiry).toLocaleString()}
                  </p>
                )}
                {liveStatus.last_error && (
                  <p className="text-xs text-red-400 mt-1">
                    Last error: {liveStatus.last_error}
                  </p>
                )}
              </div>
            </div>
            
            {brokerConfig && (
              <div className="text-right">
                <p className="text-sm text-slate-400">Broker: {brokerConfig.broker_name}</p>
                <p className="text-xs text-slate-500">User: {brokerConfig.user_data?.user_id || 'Unknown'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">
            Connect your broker and import your portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="setup" className="data-[state=active]:bg-slate-600">
                Broker Setup
              </TabsTrigger>
              <TabsTrigger value="import" className="data-[state=active]:bg-slate-600" disabled={!(brokerConfig?.is_connected && liveStatus.backendConnected)}>
                Portfolio Import
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup" className="mt-6">
              <BrokerSetup 
                config={brokerConfig} 
                onConfigSaved={handleConfigSaved}
                onConnectionComplete={onConnectionComplete}
                liveStatus={liveStatus}
              />
            </TabsContent>
            
            <TabsContent value="import" className="mt-6">
              <PortfolioImport 
                brokerConfig={brokerConfig}
                onImportComplete={handleImportComplete}
                importedPositions={importedPositions}
                liveStatus={liveStatus}
                fetchLivePortfolio={handleFetchLivePortfolio}
                portfolio={portfolio}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
