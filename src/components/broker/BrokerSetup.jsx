
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
import { toast } from "@/components/ui/use-toast"; // Assuming shadcn/ui toast system
import { createPageUrl } from '@/utils'; // Import createPageUrl

export default function BrokerSetup({ 
  onConfigSaved, 
  existingConfig = null,
  isLoading = false,
  onConnectionComplete 
}) {
  const [config, setConfig] = useState({
    broker_name: 'zerodha',
    api_key: '',
    api_secret: '',
    ...existingConfig
  });
  const [step, setStep] = useState(existingConfig?.is_connected ? 'connected' : 'credentials');
  const [isConnecting, setIsConnecting] = useState(false); // Used as 'setSaving' from outline
  const [error, setError] = useState('');
  const [requestToken, setRequestToken] = useState('');
  // verificationData is now expected to come from existingConfig after a successful connection and parent re-fetch

  // Listen for message from popup window
  useEffect(() => {
    const handleAuthMessage = (event) => {
        // Only process messages that are specifically broker auth messages
        if (!event.data || !event.data.type || 
            !['BROKER_AUTH_SUCCESS', 'BROKER_AUTH_ERROR'].includes(event.data.type)) {
            // Ignore non-broker messages (like Stripe, analytics, etc.)
            return;
        }

        const allowedOrigins = [
            'https://preview--quantum-leap-trading-15b08bd5.base44.app',
            'https://app.base44.com'
        ];

        if (!allowedOrigins.includes(event.origin)) {
            console.warn("Blocked broker auth message from untrusted origin:", event.origin);
            return;
        }

        if (event.data?.type === 'BROKER_AUTH_SUCCESS') {
            toast({
                title: "Authentication Successful",
                description: "Received token from broker. Please complete the setup.",
                variant: "success",
            });
            setRequestToken(event.data.requestToken);
            setStep('complete');
            // Clear temporary credentials from session storage
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
            // Clear temporary credentials from session storage
            sessionStorage.removeItem('broker_api_key');
            sessionStorage.removeItem('broker_api_secret');
        }
    };

    window.addEventListener('message', handleAuthMessage, false);

    return () => {
        window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  // Generate the correct frontend redirect URL using the platform utility
  const getRedirectUrl = () => {
    return createPageUrl('BrokerCallback');
  };

  // Generate the correct redirect URL for the BACKEND (what Zerodha needs configured)
  const getBackendRedirectUrl = () => {
    // This is the URL that Zerodha will call on your backend server
    return 'https://web-production-de0bc.up.railway.app/api/broker/callback';
  };

  const brokerInfo = {
    zerodha: {
      name: 'Zerodha Kite Connect',
      loginUrl: 'https://kite.zerodha.com/connect/login', // This URL is now less relevant for client-side direct redirect
      docsUrl: 'https://kite.trade/docs/connect/v3/',
      description: 'Connect your Zerodha account to enable automated trading',
      steps: [
        'Create a Kite Connect app at https://developers.kite.trade/apps/',
        'Get your API Key and API Secret from the app dashboard',
        'Set the redirect URL in your Kite app to the one shown below.',
        '<strong>IMPORTANT:</strong> This must be the <strong>backend</strong> URL, not the frontend one.',
        'Enter your credentials below and complete the OAuth flow in the new window.'
      ]
    },
    upstox: {
      name: 'Upstox Pro API',
      loginUrl: 'https://api.upstox.com/v2/login/authorization',
      docsUrl: 'https://upstox.com/developer/api-docs/',
      description: 'Connect your Upstox account for trading automation',
      steps: [
        'Create an app at Upstox Developer Console',
        'Get your API Key and Secret',
        'Configure redirect URL',
        'Complete OAuth authentication'
      ]
    },
    angel: {
      name: 'Angel Broking SmartAPI',
      loginUrl: 'https://smartapi.angelbroking.com',
      docsUrl: 'https://smartapi.angelbroking.com/docs',
      description: 'Connect your Angel Broking account',
      steps: [
        'Register at Angel SmartAPI portal',
        'Generate API credentials',
        'Set up redirect URL',
        'Authenticate your account'
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
      // Save credentials first. This is important.
      // This call to onConfigSaved will persist the API key/secret to the database
      const configData = {
        ...config,
        connection_status: 'connecting',
        is_connected: false
      };

      await onConfigSaved(configData);
      
      // Store API credentials temporarily for the callback to use
      sessionStorage.setItem('broker_api_key', config.api_key);
      sessionStorage.setItem('broker_api_secret', config.api_secret);
      
      toast({
        title: "Configuration Saved",
        description: "Opening Zerodha login in a new window...",
      });

      // Open Zerodha login in a popup window
      const kiteConnectURL = `https://kite.trade/connect/login?api_key=${config.api_key}&v=3`;
      const popup = window.open(kiteConnectURL, 'ZerodhaAuth', 'width=800,height=700,resizable=yes,scrollbars=yes');
      
      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed == 'undefined') {
        // Popup was blocked, use direct redirect
        setError('Popup was blocked. Redirecting directly to Zerodha...');
        toast({
            title: "Popup Blocked",
            description: "Your browser blocked the popup. Redirecting you directly to the broker's login page. Please authorize and you will be redirected back.",
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
      console.error('Broker connection error:', error);
      setIsConnecting(false);
    }
  };

  const handleCompleteSetup = async () => {
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
    console.log('Starting setup completion...');

    try {
      // Step 1: Call the backend to exchange the request token for an access token.
      // The backend handles the secure token exchange and saves it to the database.
      const BACKEND_URL = 'https://web-production-de0bc.up.railway.app';
      const payload = {
          request_token: requestToken,
          // Use API key and secret from config, or from sessionStorage if they were temporarily stored for the callback
          api_key: config.api_key || sessionStorage.getItem('broker_api_key'),
          api_secret: config.api_secret || sessionStorage.getItem('broker_api_secret')
      };
      
      console.log('Calling backend to generate session with payload:', payload);

      const response = await fetch(`${BACKEND_URL}/api/broker/generate-session`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
      });
      
      console.log('Backend response received. Status:', response.status);

      if (!response.ok) {
          let errorDataMessage = `Backend responded with status ${response.status}.`;
          try {
              const errorData = await response.json();
              errorDataMessage = errorData.message || JSON.stringify(errorData);
          } catch(e) {
              console.error("Could not parse error JSON:", e);
              // Try to get text if JSON fails
              const textError = await response.text();
              errorDataMessage = textError || errorDataMessage;
          }
          throw new Error(errorDataMessage);
      }

      const result = await response.json();
      console.log('Backend result parsed:', result);
      
      if (result.status === 'success') {
        console.log('Setup success. Saving config...');
        // Update the config with connection success, and potentially store access_token
        await onConfigSaved({
          ...config,
          is_connected: true,
          connection_status: 'connected',
          access_token: result.access_token || 'connected' // Store if provided by backend
        });

        if (onConnectionComplete) {
          console.log('Calling onConnectionComplete...');
          onConnectionComplete();
        }
        
        setStep('connected');
        toast({
          title: "Setup Complete",
          description: "Broker connected successfully!",
          variant: "success",
        });
        console.log('UI updated to connected state.');
      } else {
        throw new Error(result.message || 'Authentication failed according to backend response.');
      }
      
    } catch (error) {
      const errorMessage = `Setup failed: ${error.message}`;
      setError(errorMessage);
      toast({
        title: "Setup Failed",
        description: "Please check the developer console for more details.",
        variant: "destructive",
      });
      console.error('Setup completion error:', errorMessage);
    } finally {
      setIsConnecting(false);
      console.log('Finished setup completion attempt.');
      // Ensure temporary credentials are cleared even if setup fails
      sessionStorage.removeItem('broker_api_key');
      sessionStorage.removeItem('broker_api_secret');
    }
  };

  const copyRedirectUrl = () => {
    navigator.clipboard.writeText(getRedirectUrl());
    toast({
      title: "URL Copied",
      description: "Redirect URL copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Broker Selection */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Broker Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Your Broker</Label>
            <Select 
              value={config.broker_name} 
              onValueChange={(value) => setConfig(prev => ({ ...prev, broker_name: value }))}
              disabled={step === 'connected'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(brokerInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500">
              {brokerInfo[config.broker_name].description}
            </p>
          </div>

          {step === 'connected' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Connected to {brokerInfo[config.broker_name].name}
              </span>
              <Badge variant="outline" className="ml-auto bg-green-100 text-green-800">
                Active
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {step !== 'connected' && (
        <Card className="trading-card border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="w-5 h-5" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-800">
              {brokerInfo[config.broker_name].steps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: step }}></span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-800">Required Redirect URL (for your {brokerInfo[config.broker_name].name} App):</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                  {getBackendRedirectUrl()}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(getBackendRedirectUrl());
                    toast({
                      title: "URL Copied",
                      description: "Backend redirect URL copied to clipboard.",
                    });
                  }}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Copy this URL and paste it into your {brokerInfo[config.broker_name].name} app's redirect URL field.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Credentials */}
      {(step === 'credentials' || step === 'oauth' || step === 'complete') && (
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your API credentials are encrypted and stored securely. We never store your trading password.
                <a 
                  href={brokerInfo[config.broker_name].docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:underline inline-flex items-center"
                >
                  Get API credentials
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="text"
                  placeholder="Enter your API key"
                  value={config.api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  disabled={isConnecting || step === 'connected'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_secret">API Secret</Label>
                <Input
                  id="api_secret"
                  type="password"
                  placeholder="Enter your API secret"
                  value={config.api_secret}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                  disabled={isConnecting || step === 'connected'}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              {step !== 'complete' && step !== 'connected' && (
                <Button 
                  onClick={handleCredentialsSubmit}
                  disabled={isConnecting || !config.api_key || !config.api_secret}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Connect to {brokerInfo[config.broker_name].name}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OAuth Flow Instructions */}
      {step === 'oauth' && (
        <Card className="trading-card border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <ExternalLink className="w-5 h-5" />
              Complete Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-amber-800">
              <p>
                <strong>Step 1:</strong> A new window has opened for {brokerInfo[config.broker_name].name} login.
              </p>
              <p>
                <strong>Step 2:</strong> Log in with your broker credentials and authorize the application.
              </p>
              <p>
                <strong>Step 3:</strong> After successful authorization, the popup window will close automatically, and this page will update.
              </p>
            </div>
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
                <p className="font-medium text-green-800">✓ Request token received successfully!</p>
            </div>
            <p className="text-sm text-slate-600">
                Click 'Complete Setup' to securely exchange the token and finalize the connection.
            </p>
            <Button 
              onClick={handleCompleteSetup}
              disabled={!requestToken || isConnecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing Setup...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connection Verification Results */}
      {step === 'connected' && existingConfig?.user_verification && (
        <Card className="trading-card border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Live Connection Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-green-800">User ID</p>
                  <p className="text-green-700">{existingConfig.user_verification.user_id}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Name</p>
                  <p className="text-green-700">{existingConfig.user_verification.user_name}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Email</p>
                  <p className="text-green-700">{existingConfig.user_verification.email}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Available Cash</p>
                  <p className="text-green-700">₹{typeof existingConfig.user_verification.available_cash === 'number' ? existingConfig.user_verification.available_cash.toLocaleString('en-IN') : 'N/A'}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded border border-green-200">
                <p className="text-xs text-green-600">
                  ✓ Live API connection established and verified with your {brokerInfo[config.broker_name].name} account
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
