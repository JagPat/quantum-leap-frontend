
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

export default function BrokerSetup({ 
  onConfigSaved, 
  existingConfig = null,
  isLoading = false,
  onConnectionComplete 
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

  // Listen for message from popup window
  useEffect(() => {
    const handleAuthMessage = (event) => {
        console.log('🔍 [Parent] Received message:', event.data, 'from origin:', event.origin);

        if (!event.data || !event.data.type || 
            !['BROKER_AUTH_SUCCESS', 'BROKER_AUTH_ERROR'].includes(event.data.type)) {
            console.log("🔍 [Parent] Ignoring irrelevant message.");
            return;
        }

        // 🔥 CRITICAL FIX: The popup (BrokerCallback) will have the same origin as this parent window.
        // A strict origin check is the most secure and correct way to handle this.
        if (event.origin !== window.location.origin) {
            console.warn(`🚨 [Parent] Blocked message. Event origin (${event.origin}) does not match window origin (${window.location.origin}).`);
            return;
        }
        
        console.log('✅ [Parent] Origin check passed.');

        if (event.data?.type === 'BROKER_AUTH_SUCCESS') {
            console.log('✅ [Parent] BROKER_AUTH_SUCCESS received. Token:', event.data.requestToken);
            toast({
                title: "Authentication Successful",
                description: "Token received. Please finalize the connection.",
                variant: "success",
            });
            setRequestToken(event.data.requestToken);
            setStep('complete'); // This is the crucial step to show the "Complete Setup" button
            sessionStorage.removeItem('broker_api_key');
            sessionStorage.removeItem('broker_api_secret');
        } else if (event.data?.type === 'BROKER_AUTH_ERROR') {
            console.error("❌ [Parent] BROKER_AUTH_ERROR received:", event.data.error);
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
  }, []);

  const getRedirectUrl = () => {
    return createPageUrl('BrokerCallback');
  };

  const getBackendRedirectUrl = () => {
    return 'https://web-production-de0bc.up.railway.app/api/broker/callback';
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
    if (!config.api_key || !config.api_secret) {
      setError('Please enter both API Key and API Secret');
      toast({
        title: "Missing Credentials",
        description: "Please provide both API Key and Secret.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const configData = {
        ...config,
        connection_status: 'connecting',
        is_connected: false
      };

      await onConfigSaved(configData);
      
      sessionStorage.setItem('broker_api_key', config.api_key);
      sessionStorage.setItem('broker_api_secret', config.api_secret);
      
      toast({
        title: "Configuration Saved",
        description: "Opening Zerodha login in a new window...",
      });

      const kiteConnectURL = `https://kite.trade/connect/login?api_key=${config.api_key}&v=3`;
      
      const popup = window.open(kiteConnectURL, 'ZerodhaAuth', 'width=800,height=700,resizable=yes,scrollbars=yes');
      
      if (!popup || popup.closed || typeof popup.closed == 'undefined') {
        setError('Popup was blocked. Redirecting directly to Zerodha...');
        toast({
            title: "Popup Blocked",
            description: "Your browser blocked the popup. Redirecting you directly to the broker's login page.",
            variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = kiteConnectURL;
        }, 2000);
        return;
      }
      
      setStep('oauth');
      
    } catch (error) {
      setError(`Failed to initiate broker connection: ${error.message}`);
      toast({
        title: "Connection Error",
        description: `Failed to save configuration. Please try again.`,
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleCompleteSetup = async () => {
    // Step 1: Initial validation
    console.log('🔍 STEP 1: Starting setup completion...');
    if (!requestToken) {
      setError('No request token received. Please try the authentication again.');
      toast({
        title: "Setup Incomplete",
        description: "No request token received. Please try the authentication again.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setError('');

    // Step 2: Setup timeout protection
    console.log('🔍 STEP 2: Setting up timeout protection...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log('⏰ TIMEOUT: Operation timed out after 30 seconds');
        controller.abort();
        setError("The connection to the backend timed out. It might be starting up. Please try again in a minute.");
        toast({
            title: "Connection Timeout",
            description: "The server took too long to respond. This can happen if the service is waking up from sleep.",
            variant: "destructive",
        });
        setIsConnecting(false);
    }, 30000);

    try {
      // Step 3: Token cleaning
      console.log('🔍 STEP 3: Cleaning request token...');
      console.log('🔍 Raw token received:', requestToken);
      
      let cleanRequestToken = requestToken.trim();
      
      if (cleanRequestToken.startsWith('http') || cleanRequestToken.includes('://')) {
        console.log('🔍 STEP 3a: Token appears to be URL, extracting...');
        try {
          const url = new URL(cleanRequestToken);
          const params = new URLSearchParams(url.search);
          
          if (params.has('request_token')) {
            cleanRequestToken = params.get('request_token');
          } else if (params.has('sess_id')) {
            cleanRequestToken = params.get('sess_id');
          } else {
            throw new Error('No valid token parameter found in URL');
          }
        } catch (urlError) {
          console.error('🔍 STEP 3a ERROR:', urlError);
          throw new Error('Invalid request token format received');
        }
      }
      
      console.log('🔍 STEP 3b: Clean token extracted:', cleanRequestToken);
      
      if (!cleanRequestToken || cleanRequestToken.length < 10) {
        throw new Error('Invalid request token - token appears to be too short or empty');
      }

      // Step 4: Backend preparation
      console.log('🔍 STEP 4: Preparing backend request...');
      const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';
      const payload = {
          request_token: cleanRequestToken,
          api_key: config.api_key || sessionStorage.getItem('broker_api_key'),
          api_secret: config.api_secret || sessionStorage.getItem('broker_api_secret')
      };
      
      console.log('🔍 Backend URL:', BACKEND_URL);
      console.log('🔍 Payload prepared (token/secrets hidden)');

      // Step 5: Wake up backend
      console.log('🔍 STEP 5: Waking up backend (if sleeping)...');
      toast({
        title: "Connecting to Backend",
        description: "Waking up the trading server...",
      });

      // Step 6: Make backend call
      console.log('🔍 STEP 6: Making backend API call...');
      const backendStartTime = Date.now();
      
      const response = await fetch(`${BACKEND_URL}/api/broker/generate-session`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
      });

      const backendEndTime = Date.now();
      const backendResponseTime = backendEndTime - backendStartTime;
      console.log(`🔍 STEP 6 COMPLETE: Backend responded in ${backendResponseTime}ms`);

      clearTimeout(timeoutId);

      // Step 7: Process backend response
      console.log('🔍 STEP 7: Processing backend response...');
      console.log('🔍 Response status:', response.status);

      if (!response.ok) {
          console.log('🔍 STEP 7 ERROR: Backend returned non-OK status');
          let errorMessage = `Backend error: ${response.status}`;
          try {
              const errorData = await response.json();
              console.log('🔍 Backend error data:', errorData);
              errorMessage = errorData.message || errorData.error || errorMessage;
          } catch(e) {
              const textError = await response.text();
              console.log('🔍 Backend error text:', textError);
              errorMessage = textError || errorMessage;
          }
          throw new Error(errorMessage);
      }

      // Step 8: Parse successful response
      console.log('🔍 STEP 8: Parsing successful backend response...');
      const result = await response.json();
      console.log('🔍 Backend result received:', {
        status: result.status,
        has_access_token: !!result.access_token,
        has_user_data: !!result.user_data
      });
      
      if (result.status === 'success' && result.access_token) {
        console.log('🔍 STEP 8a: Backend success confirmed, preparing user verification...');
        
        const userVerification = result.user_data ? {
          user_id: result.user_data.user_id,
          user_name: result.user_data.user_name,
          email: result.user_data.email,
          broker: result.user_data.profile?.broker || 'ZERODHA',
          available_cash: result.user_data.available_cash || 0,
          ...result.user_data.profile
        } : null;

        console.log('🔍 STEP 8b: User verification prepared');

        // Step 9: Prepare Base44 save data
        console.log('🔍 STEP 9: Preparing data for Base44 save...');
        const configDataToSave = {
          ...config,
          is_connected: true,
          connection_status: 'connected',
          access_token: result.access_token,
          request_token: cleanRequestToken,
          user_verification: userVerification,
          error_message: null
        };

        console.log('🔍 Config data prepared for save:', {
          ...configDataToSave,
          access_token: configDataToSave.access_token ? '[PRESENT]' : '[MISSING]',
          api_secret: '[HIDDEN]'
        });

        // Step 10: Critical Base44 save operation
        console.log('🔍 STEP 10: Starting Base44 save operation...');
        toast({
          title: "Saving Configuration",
          description: "Saving your broker connection to Base44...",
        });

        try {
          console.log('💾 Attempting Base44 save...');
          const base44SaveStartTime = Date.now();
          
          const savePromise = onConfigSaved(configDataToSave);
          const saveTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
              console.log('⏰ BASE44 SAVE TIMEOUT: Save operation timed out after 60 seconds');
              reject(new Error('Base44 save operation timed out after 60 seconds'));
            }, 60000) // 60 second timeout for Base44 save
          );
          
          await Promise.race([savePromise, saveTimeoutPromise]);
          
          const base44SaveEndTime = Date.now();
          const base44SaveTime = base44SaveEndTime - base44SaveStartTime;
          console.log(`✅ STEP 10 COMPLETE: Base44 save completed in ${base44SaveTime}ms`);
          
        } catch (saveError) {
          console.error('❌ STEP 10 FAILED: Base44 save operation failed:', saveError);
          console.error('❌ Save error details:', saveError.message);
          
          toast({
            title: "Save Failed", 
            description: `Configuration couldn't be saved: ${saveError.message}`,
            variant: "destructive",
          });
          throw new Error(`Base44 configuration save failed: ${saveError.message}`);
        }

        // Step 11: Finalization
        console.log('🔍 STEP 11: Finalizing setup...');
        
        if (onConnectionComplete) {
          console.log('🔍 STEP 11a: Calling onConnectionComplete...');
          onConnectionComplete();
        }
        
        console.log('🔍 STEP 11b: Setting final UI state...');
        setStep('connected');
        
        console.log('🔍 STEP 11c: Showing success message...');
        toast({
          title: "Setup Complete",
          description: "Broker connected successfully! Portfolio access is now available.",
        });
        
        console.log('✅ AUTHENTICATION FLOW COMPLETE: All steps successful!');
        
      } else {
        console.error('❌ STEP 8 FAILED: Backend success but missing access token');
        throw new Error(result.message || 'Authentication failed - no access token received from backend.');
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('🔍 OPERATION ABORTED: User or timeout cancelled the operation');
      } else {
        console.error('❌ AUTHENTICATION FAILED at some step:', error.message);
        const errorMessage = `Setup failed: ${error.message}`;
        setError(errorMessage);
        toast({
          title: "Setup Failed",
          description: "Please check your API credentials and try again.",
          variant: "destructive",
        });
      }
    } finally {
      console.log('🔍 CLEANUP: Resetting connection state...');
      setIsConnecting(false);
      sessionStorage.removeItem('broker_api_key');
      sessionStorage.removeItem('broker_api_secret');
    }
  };

  const currentBroker = brokerInfo[config.broker_name] || brokerInfo.zerodha;

  return (
    <div>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Instructions */}
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
        
        {/* Right Column: Setup Steps */}
        <div className="space-y-6">
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
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

          {/* Step 2: OAuth */}
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

          {/* Token Completion Step */}
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

          {/* Connected State */}
          {step === 'connected' && (
             <Card className="trading-card border-green-300 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    Broker Connected
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-green-700">
                    Your {currentBroker.name} account is successfully connected and synchronized.
                  </p>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                        // Here you'd implement a disconnect logic
                        console.log("Disconnecting...");
                    }}
                  >
                    Disconnect
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
