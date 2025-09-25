import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Key, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Shield,
  RefreshCw,
  Link as LinkIcon,
  Copy,
  Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from '@/utils';
import { config as deploymentConfig } from '@/config/deployment.js';
import brokerAPI from '../../services/brokerAPI.js';

export default function BrokerSetup({ 
  onConfigSaved, 
  existingConfig = null,
  isLoading = false,
  onConnectionComplete,
  liveStatus = null
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    broker_name: 'zerodha',
    api_key: '',
    api_secret: '',
    ...existingConfig
  });
  const [step, setStep] = useState(existingConfig?.is_connected ? 'connected' : 'credentials');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [requestToken, setRequestToken] = useState('');

  // Add a derived flag for true connection
  const isTrulyConnected = (existingConfig?.is_connected && liveStatus?.backendConnected);

  const getBackendBaseUrl = () => {
    const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL;
    const baseUrl = envUrl && envUrl.length > 0 
      ? envUrl
      : (deploymentConfig?.urls?.backend || 'https://web-production-de0bc.up.railway.app');
    return baseUrl.replace(/\/$/, '');
  };

  useEffect(() => {
    const handleAuthMessage = (event) => {
        console.log("📨 [BrokerSetup] Received message from origin:", event.origin);
        console.log("📨 [BrokerSetup] Message data:", event.data);
        
        // Enhanced origin validation - be more permissive for development
        const allowedOrigins = [
            window.location.origin, // Current origin
            'https://quantum-leap-frontend-production.up.railway.app', // Production frontend
            'https://web-production-de0bc.up.railway.app', // Production backend
            'http://localhost:5173', // Vite dev server
            'http://localhost:5174', // Alternative Vite port
            'http://localhost:5175', // Alternative Vite port
            'http://localhost:3000', // React dev server
            'http://localhost:8080'  // Alternative dev port
        ];
        
        // For development, also allow any localhost origin
        const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
        const isAllowedOrigin = allowedOrigins.includes(event.origin) || isLocalhost;
        
        if (!isAllowedOrigin) {
            console.log("🚫 [BrokerSetup] Message from blocked origin:", event.origin);
            return;
        }
        
        console.log("✅ [BrokerSetup] Message from allowed origin:", event.origin);
        
        if (event.data?.type === 'BROKER_AUTH_SUCCESS') {
            // Handle successful OAuth completion
            if (event.data.backend_exchange && event.data.requestToken) {
                console.log("🎉 OAuth completed successfully with request_token:", event.data.requestToken);
                
                // OAuth is complete - show success and update UI
                toast({
                    title: "Authentication Successful",
                    description: "Broker connection established successfully!",
                    variant: "default",
                });
                
                // Update the config with success status
                const updatedConfig = {
                    ...config,
                    connection_status: 'connected',
                    is_connected: true,
                    request_token: event.data.requestToken,
                    connected_at: new Date().toISOString()
                };
                
                onConfigSaved(updatedConfig);
                setStep('complete');
                setIsConnecting(false);
                
            } else if (event.data.backend_exchange && event.data.user_id) {
                console.log("🎉 Backend completed token exchange, user_id:", event.data.user_id);
                
                // Fetch the session data from backend
                handleBackendAuthSuccess(event.data.user_id);
            } else {
                // EXISTING: Handle frontend token exchange
                console.log("🔄 Frontend token exchange required, request_token:", event.data.requestToken);
                
                toast({
                    title: "Authentication Successful",
                    description: "Token received. Please finalize the connection.",
                    variant: "success",
                });
                setRequestToken(event.data.requestToken);
                setStep('complete');
            }
            
            sessionStorage.removeItem('broker_api_key');
            sessionStorage.removeItem('broker_api_secret');
        } else if (event.data?.type === 'BROKER_AUTH_ERROR') {
            setError(event.data.error || 'Broker authentication failed.');
            toast({
                title: "Authentication Error",
                description: event.data.error || 'The broker authentication process failed or was cancelled.',
                variant: "destructive",
            });
            setStep('credentials');
            setIsConnecting(false);
            sessionStorage.removeItem('broker_api_key');
            sessionStorage.removeItem('broker_api_secret');
        }
    };

    window.addEventListener('message', handleAuthMessage, false);

    return () => {
        window.removeEventListener('message', handleAuthMessage);
    };
  }, [toast]);

  // NEW: Handle backend-exchanged authentication
  const normalizeBackendConfig = (payload, context = {}) => {
    if (!payload) return null;

    const connectionStatus = payload.connectionStatus || payload.connection_status || null;
    const connectionValidation = payload.connectionValidation || payload.connection_validation || null;
    const tokenStatus = payload.tokenStatus || payload.token_status || null;
    const backendUserId = context.backendUserId || null;

    const resolvedUserId = context.resolvedUserId || 
      payload.user_id ||
      payload.userId ||
      payload.broker_user_id ||
      payload.brokerUserId ||
      connectionValidation?.userId ||
      tokenStatus?.userId ||
      backendUserId ||
      null;

    const isConnected = typeof payload.is_connected === 'boolean' ? payload.is_connected
      : typeof payload.isConnected === 'boolean' ? payload.isConnected
      : connectionStatus?.state === 'connected';

    const brokerName = payload.broker_name || payload.brokerName || 'zerodha';
    const apiKey = payload.api_key || payload.apiKey || context.apiKey || config?.api_key || '';

    const accessToken = payload.access_token || payload.accessToken || null;
    const sessionId = payload.session_id || payload.sessionId || payload.id || Date.now().toString();

    const userData = payload.user_data || payload.userData || (resolvedUserId ? {
      user_id: resolvedUserId,
      user_name: connectionValidation?.userName || null,
      user_shortname: connectionValidation?.userShortname || null,
    } : null);

    return {
      resolvedUserId,
      brokerConfig: {
        id: sessionId,
        broker_name: brokerName,
        api_key: apiKey,
        is_connected: !!isConnected,
        connection_status: connectionStatus?.state || (isConnected ? 'connected' : 'pending'),
        connectionStatus,
        access_token: accessToken,
        request_token: payload.request_token || payload.requestToken || context.requestToken || null,
        user_data: userData,
        backend_connection: {
          connectionStatus,
          connectionValidation,
          tokenStatus,
          lastSync: payload.lastSync || payload.last_sync || null,
          updatedAt: payload.updatedAt || payload.updated_at || null,
        }
      }
    };
  };

  const attemptFetchBackendConfig = async (candidateId, backendUserId) => {
    const backendBaseUrl = getBackendBaseUrl();
    const candidateLabel = candidateId || 'unknown';

    const endpoints = [
      {
        url: `${backendBaseUrl}/api/modules/auth/broker/status?user_id=${encodeURIComponent(candidateId)}`,
        parser: async (payload) => {
          if (payload?.success && payload.data) {
            const normalized = normalizeBackendConfig({ ...payload.data, id: payload.data.configId }, { backendUserId, resolvedUserId: candidateId });
            if (normalized?.brokerConfig?.is_connected) {
              return normalized;
            }
          }
          return null;
        }
      },
      {
        url: `${backendBaseUrl}/api/modules/auth/broker/configs?user_id=${encodeURIComponent(candidateId)}`,
        parser: async (payload) => {
          if (payload?.success && Array.isArray(payload.data)) {
            const configMatch = payload.data.find((item) => {
              const name = item.brokerName || item.broker_name;
              const connected = typeof item.isConnected === 'boolean' ? item.isConnected : item.connectionStatus?.state === 'connected';
              return (name || '').toLowerCase() === 'zerodha' && connected;
            }) || payload.data[0];

            if (configMatch) {
              const normalized = normalizeBackendConfig(configMatch, { backendUserId, resolvedUserId: candidateId });
              if (normalized?.brokerConfig) {
                return normalized;
              }
            }
          }
          return null;
        }
      },
      {
        url: `${backendBaseUrl}/broker/session?user_id=${encodeURIComponent(candidateId)}`,
        parser: async (payload) => {
          if (!payload) return null;
          const statusSuccess = payload.status === 'success' || payload.success === true;
          const isConnected = payload.is_connected || payload.isConnected || payload.data?.is_connected;

          if (statusSuccess && isConnected) {
            const normalized = normalizeBackendConfig({
              ...payload,
              ...payload.data,
            }, { backendUserId, resolvedUserId: candidateId });
            if (normalized?.brokerConfig) {
              return normalized;
            }
          }
          return null;
        }
      }
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🌐 [BrokerSetup] (${candidateLabel}) Fetching backend config from:`, endpoint.url);
        const response = await fetch(endpoint.url, {
          headers: {
            'X-User-ID': candidateId,
          },
          credentials: 'include',
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch (parseError) {
          throw new Error(`Invalid JSON response (${response.status})`);
        }

        console.log(`📡 [BrokerSetup] (${candidateLabel}) Response from backend:`, payload);

        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
        }

        const parsed = await endpoint.parser(payload);
        if (parsed?.brokerConfig) {
          return parsed;
        }

        lastError = new Error('Response received but connection not confirmed yet.');
      } catch (error) {
        console.error(`❌ [BrokerSetup] (${candidateLabel}) Fetch failed:`, error);
        lastError = error;
      }
    }

    throw lastError || new Error('No session data found');
  };

  const handleBackendAuthSuccess = async (backendUserId) => {
    setIsConnecting(true);
    setError('');
    
    try {
      const candidateUserIds = Array.from(new Set([
        localStorage.getItem('temp_user_id'),
        backendUserId,
        config?.user_data?.user_id,
      ].filter(Boolean)));

      if (candidateUserIds.length === 0) {
        throw new Error('Unable to determine session identifier. Please restart the authentication flow.');
      }

      console.log('🔍 [BrokerSetup] Attempting to fetch session data. Candidates:', candidateUserIds);

      let resolvedUserId = null;
      let brokerConfigPayload = null;

      for (const candidateId of candidateUserIds) {
        try {
          const result = await attemptFetchBackendConfig(candidateId, backendUserId);
          if (result?.brokerConfig) {
            brokerConfigPayload = result.brokerConfig;
            resolvedUserId = result.resolvedUserId || candidateId;
            break;
          }
        } catch (candidateError) {
          console.error(`❌ [BrokerSetup] Session fetch failed for ${candidateId}:`, candidateError);
        }
      }

      if (!brokerConfigPayload) {
        throw new Error('Failed to retrieve session data');
      }

      if (resolvedUserId) {
        localStorage.setItem('temp_user_id', resolvedUserId);
      }

      const connectedUserId = brokerConfigPayload.user_data?.user_id || resolvedUserId || backendUserId;

      const normalizedBrokerConfig = {
        ...config,
        ...brokerConfigPayload,
        id: brokerConfigPayload.id || Date.now().toString(),
        broker_name: brokerConfigPayload.broker_name || 'zerodha',
        api_key: brokerConfigPayload.api_key || config.api_key,
        is_connected: true,
        connection_status: 'connected',
        user_id: connectedUserId,
        broker_user_id: backendUserId || connectedUserId,
        updated_at: new Date().toISOString()
      };

      console.log('✅ [BrokerSetup] Normalized broker config:', normalizedBrokerConfig);

      localStorage.removeItem('oauth_config_id');
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('temp_user_id_original');

      setConfig(prev => ({
        ...prev,
        ...normalizedBrokerConfig,
      }));

      const existingConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const updatedConfigs = existingConfigs.filter(c => c.broker_name !== 'zerodha');
      updatedConfigs.push(normalizedBrokerConfig);
      localStorage.setItem('brokerConfigs', JSON.stringify(updatedConfigs));

      await onConfigSaved(normalizedBrokerConfig);

      toast({
        title: 'Connection Successful',
        description: connectedUserId ? `Connected to Zerodha as ${connectedUserId}` : 'Broker connection completed successfully.',
        variant: 'success',
      });

      setStep('connected');

      if (onConnectionComplete) {
        onConnectionComplete(normalizedBrokerConfig);
      }
    } catch (error) {
      console.error("❌ [BrokerSetup] Backend auth error:", error);
      setError(`Failed to complete authentication: ${error.message}`);
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
      setStep('credentials');
    } finally {
      setIsConnecting(false);
    }
  };

  const getRedirectUrl = () => {
    // DEPLOYMENT-READY: Dynamic redirect URL that works in all environments
    return `${window.location.origin}/broker-callback`;
  };

  const getBackendRedirectUrl = () => {
    // CRITICAL FIX: This should point to our Railway backend with correct auth prefix
    return `${getBackendBaseUrl()}/broker/callback`;
  };

  const brokerInfo = {
    zerodha: {
      name: 'Zerodha Kite Connect',
      loginUrl: 'https://kite.zerodha.com/connect/login',
      docsUrl: 'https://kite.trade/docs/connect/v3/',
      description: 'Connect your Zerodha account to enable automated trading',
      steps: [
        'Create a Kite Connect app at https://developers.kite.trade/apps/',
        'Get your API Key and API Secret from the app dashboard',
        'Set the redirect URL in your Kite app to the one shown below.',
        '<strong>IMPORTANT:</strong> This must be the <strong>backend</strong> URL, not the frontend one.',
        'Enter your credentials below and complete the OAuth flow in the new window.'
      ]
    }
  };

  const handleCredentialsSubmit = async () => {
    setError('');
    setIsConnecting(true);

    try {
      await onConfigSaved({
        ...config,
        connection_status: 'connecting',
        is_connected: false,
      });

      sessionStorage.setItem('broker_api_key', config.api_key);
      sessionStorage.setItem('broker_api_secret', config.api_secret);

      // Setup OAuth credentials on backend
      console.log("🔧 [BrokerSetup] Setting up OAuth credentials on backend...");
      
      // Generate a consistent user ID for this session (UUID format)
      const userId = localStorage.getItem('temp_user_id') || 
                    crypto.randomUUID();
      localStorage.setItem('temp_user_id', userId);
      
      const setupResult = await brokerAPI.setupOAuth(config.api_key, config.api_secret, userId);
      console.log("📡 [BrokerSetup] Backend setup response:", setupResult);
      
      try {
        localStorage.setItem('oauth_config_id', setupResult.config_id);
        localStorage.setItem('oauth_state', setupResult.state);
        if (setupResult?.user_id) {
          localStorage.setItem('temp_user_id', setupResult.user_id);
        }
        if (setupResult?.original_user_id) {
          localStorage.setItem('temp_user_id_original', setupResult.original_user_id);
        }
      } catch (storageError) {
        console.warn('⚠️ [BrokerSetup] Failed to persist OAuth flow metadata:', storageError);
      }

      const authUrl = setupResult.oauth_url;
      
      console.log("🚀 [BrokerSetup] Opening OAuth popup with URL:", authUrl);
      console.log("🔍 [BrokerSetup] Current origin:", window.location.origin);
      
      const popup = window.open(authUrl, 'brokerAuth', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (!popup) {
        setError("Popup blocked. Please allow popups for this site.");
        toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site and try again.",
            variant: "destructive",
        });
      } else {
        console.log("✅ [BrokerSetup] Popup opened successfully");
        toast({
          title: "OAuth Started",
          description: "Complete the authentication in the popup window.",
          variant: "default",
        });
        
        // Monitor popup for debugging
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            console.log("🔄 [BrokerSetup] Popup was closed");
            clearInterval(checkPopup);
          }
        }, 1000);
        
        // Clear interval after 5 minutes
        setTimeout(() => clearInterval(checkPopup), 300000);
      }
    } catch (e) {
      console.error("❌ [BrokerSetup] Error in handleCredentialsSubmit:", e);
      const baseMessage = e?.message || 'Failed to setup OAuth';
      const displayMessage = baseMessage.startsWith('Failed to setup OAuth')
        ? baseMessage
        : `Failed to setup OAuth: ${baseMessage}`;
      setError(displayMessage);
      toast({
        title: "Setup Error",
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!requestToken) {
      setError('No request token available. Please restart the authentication process.');
      toast({ title: "Error", description: "No request token found.", variant: "destructive" });
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      console.log("🚀 [Component] Starting direct authentication with Railway backend...");
      
      const apiKey = config.api_key || sessionStorage.getItem('broker_api_key');
      const apiSecret = config.api_secret || sessionStorage.getItem('broker_api_secret');
      let finalConfigId = config.id || localStorage.getItem('oauth_config_id');
      const effectiveUserId = config.user_id || config.userId || localStorage.getItem('temp_user_id');

      // Backend now supports finalization using config_id + request_token only.
      // If keys are missing in memory, we rely on the stored broker_config credentials.
      if (!finalConfigId && effectiveUserId) {
        try {
          const sessResp = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/modules/auth/broker/session?user_id=${encodeURIComponent(effectiveUserId)}`);
          const sessJson = await sessResp.json().catch(() => ({}));
          finalConfigId = sessJson?.data?.id || finalConfigId;
          if (finalConfigId) localStorage.setItem('oauth_config_id', finalConfigId);
        } catch {}
      }

      if (!finalConfigId) throw new Error("Missing configuration identifier. Please restart authentication.");
      
      // Clean the request token if it contains a URL
      let cleanRequestToken = requestToken.trim();
      if (cleanRequestToken.startsWith('http') || cleanRequestToken.includes('://')) {
        console.log("🔧 Cleaning URL-format token...");
        const url = new URL(cleanRequestToken);
        const urlParams = new URLSearchParams(url.search);
        
        if (urlParams.has('request_token')) {
          cleanRequestToken = urlParams.get('request_token');
        } else if (urlParams.has('sess_id')) {
          cleanRequestToken = urlParams.get('sess_id');
        }
        console.log("✅ Cleaned token:", cleanRequestToken);
      }
      
      // Generate session via API service
      const result = await brokerAPI.generateSession(
        cleanRequestToken,
        apiKey || undefined,
        apiSecret || undefined,
        {
          userId: effectiveUserId,
          configId: finalConfigId
        }
      );
      console.log("📡 Backend response:", result);

      if (result.status === 'success') {
        console.log("✅ [Component] Authentication successful!");
        
        // CRITICAL FIX: Verify user_data structure before saving
        if (!result.user_data?.user_id) {
          console.error("❌ Backend response missing user_id:", result.user_data);
          setError("Authentication successful but backend returned invalid user data. Please try again.");
          return;
        }

        console.log("✅ Verified user_data structure:", result.user_data);
        console.log("✅ Verified user_id:", result.user_data.user_id);
        console.log("✅ Access token length:", result.access_token?.length);

        localStorage.removeItem('oauth_config_id');
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('temp_user_id_original');

        // Create persistent session on backend
        try {
          console.log("🔐 [Component] Creating persistent session...");
          const sessionData = {
            access_token: result.access_token,
            api_key: apiKey,
            user_data: result.user_data,
            broker_name: config.broker_name || 'zerodha',
            created_at: new Date().toISOString()
          };
          
          const sessionResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/broker/session/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': result.user_data.user_id,
              'Authorization': `token ${apiKey}:${result.access_token}`
            },
            body: JSON.stringify(sessionData)
          });
          
          if (sessionResponse.ok) {
            console.log("✅ [Component] Persistent session created successfully");
          } else {
            console.warn("⚠️ [Component] Failed to create persistent session, but continuing...");
          }
        } catch (sessionError) {
          console.warn("⚠️ [Component] Session creation failed, but continuing:", sessionError);
        }
        
        // Save the correct data structure
        const configToSave = {
          ...config,
          is_connected: true,
          access_token: result.access_token,
          request_token: cleanRequestToken,
          user_data: result.user_data, // Ensure this is saved correctly
          connection_status: 'connected'
        };
        
        console.log("💾 [Component] Saving config:", configToSave);
        
        await onConfigSaved(configToSave);
        
        // CRITICAL: Verify config was saved correctly
        const savedConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
        const latestConfig = savedConfigs[savedConfigs.length - 1];
        
        console.log("🔍 [Component] Verification - saved config:", latestConfig);
        console.log("🔍 [Component] Verification - user_data exists:", !!latestConfig?.user_data);
        console.log("🔍 [Component] Verification - user_id:", latestConfig?.user_data?.user_id);
        
        if (!latestConfig?.user_data?.user_id) {
          console.error("❌ [Component] Config saved but user_data missing! Saved config:", latestConfig);
          setError("Configuration saved but user data verification failed. Please try reconnecting.");
          return;
        }
        
        toast({
          title: "Success",
          description: "Broker connected successfully!",
        });

        setStep('connected');
        if(onConnectionComplete) onConnectionComplete();
        
      } else {
        console.error("❌ [Component] Authentication failed:", result.message);
        setError(result.message || "An unknown authentication error occurred.");
        toast({
          title: "Authentication Failed",
          description: result.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("💥 [Component] Error calling backend API:", error);
      setError(`API call error: ${error.message}`);
      toast({
        title: "Connection Error", 
        description: `Failed to connect to backend: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
      sessionStorage.removeItem('broker_api_key');
      sessionStorage.removeItem('broker_api_secret');
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm("Are you sure you want to disconnect your broker? This will invalidate your current session.")) {
        setIsConnecting(true);
        setError('');
        try {
            // Get user_id from existing config or user data
            const userId = existingConfig?.user_data?.user_id;
            
            if (!userId) {
                throw new Error('User ID not found. Cannot disconnect.');
            }
            
            // Invalidate session via API service
            const result = await brokerAPI.invalidateSession(userId);
            console.log("🔓 Disconnect response:", result);

            if (existingConfig) {
                 await onConfigSaved({
                    ...existingConfig,
                    is_connected: false,
                    access_token: '',
                    connection_status: 'disconnected',
                    error_message: null
                 });
            }

            toast({
                title: "Disconnected",
                description: "Your broker connection has been successfully terminated.",
            });
            
            setStep('credentials');
            if(onConnectionComplete) onConnectionComplete();

        } catch (error) {
            console.error("Error during disconnect:", error);
            setError(error.message || "Failed to disconnect. Please try again.");
            toast({
                title: "Disconnect Failed",
                description: error.message || "Could not terminate the session.",
                variant: "destructive",
            });
        } finally {
            setIsConnecting(false);
        }
    }
  };

  const currentBroker = brokerInfo[config.broker_name] || brokerInfo.zerodha;

  return (
    <div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5"/>
              {currentBroker.name} Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              {currentBroker.description}
            </p>
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold text-slate-800">Setup Instructions</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                {currentBroker.steps.map((step, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
                ))}
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <Label className="font-semibold text-blue-800">Backend Redirect URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  readOnly
                  value={getBackendRedirectUrl()}
                  className="bg-white"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => navigator.clipboard.writeText(getBackendRedirectUrl())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button asChild variant="outline">
              <a href={currentBroker.docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Zerodha Docs
              </a>
            </Button>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          {!isTrulyConnected && step === 'credentials' && (
            <Card className="trading-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-slate-600"/>
                  Step 1: Enter Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>API Key</Label>
                  <Input 
                    placeholder="Enter your API Key" 
                    value={config.api_key}
                    onChange={(e) => setConfig({...config, api_key: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label>API Secret</Label>
                  <Input 
                    type="password"
                    placeholder="Enter your API Secret"
                    value={config.api_secret}
                    onChange={(e) => setConfig({...config, api_secret: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleCredentialsSubmit}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Saving...' : 'Save & Authenticate'}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'oauth' && (
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Step 2: Authenticate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="animate-spin text-slate-600">
                    <RefreshCw className="w-12 h-12 mx-auto"/>
                </div>
                <p className="font-medium text-slate-800 text-center">Waiting for Authentication</p>
                <p className="text-sm text-slate-600 text-center">
                    Please complete the login process in the popup window.
                </p>
              </CardContent>
            </Card>
          )}

          {step === 'complete' && (
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Finalize Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-800">✓ Authentication successful!</p>
                </div>
                <p className="text-sm text-slate-600">
                    Click 'Complete Setup' to securely exchange the token and finalize the connection.
                </p>
                <Button 
                  onClick={handleCompleteSetup}
                  disabled={!requestToken || isConnecting}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Completing Setup...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                </Button>
                 {isConnecting && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        This may take a moment, especially if the server is waking up.
                    </p>
                )}
              </CardContent>
            </Card>
          )}

          {isTrulyConnected && (
            <Card className="trading-card border-green-300 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  Broker Connected (Backend Verified)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-green-700">
                  Your {currentBroker.name} account is successfully connected and synchronized (backend verified).
                </p>
                <Button 
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
