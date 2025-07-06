
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

export default function BrokerSetup({ 
  onConfigSaved, 
  existingConfig = null,
  isLoading = false 
}) {
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
  const [verificationData, setVerificationData] = useState(null); // New state for verification data

  // Generate the correct redirect URL
  const getRedirectUrl = () => {
    const baseUrl = window.location.origin;
    // For development, use localhost, for production use the actual domain
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return 'http://127.0.0.1:3000/broker-callback';
    }
    return `${baseUrl}/broker-callback`;
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
        'Set the redirect URL in your Kite app to match the one shown below',
        'IMPORTANT: Add your Zerodha Client ID to the list of users for your Kite app.',
        'Enter your credentials below and complete the OAuth flow'
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
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Save the credentials first
      const configData = {
        ...config,
        connection_status: 'connecting',
        is_connected: false
      };

      const savedConfig = existingConfig 
        ? await onConfigSaved({ ...existingConfig, ...configData })
        : await onConfigSaved(configData);

      // Generate the Kite Connect login URL
      const redirectUrl = getRedirectUrl();
      const loginUrl = `${brokerInfo[config.broker_name].loginUrl}?api_key=${config.api_key}&redirect_url=${encodeURIComponent(redirectUrl)}`;
      
      setStep('oauth');
      
      // Open broker login in new window
      const authWindow = window.open(loginUrl, 'broker-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      
      // Listen for the OAuth callback
      const handleCallback = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'BROKER_AUTH_SUCCESS') {
          setRequestToken(event.data.requestToken);
          setStep('complete');
          authWindow?.close();
          window.removeEventListener('message', handleCallback);
        } else if (event.data.type === 'BROKER_AUTH_ERROR') {
          const errorMessage = event.data.error || 'Authentication failed';
          if (typeof errorMessage === 'string' && config.broker_name === 'zerodha' && errorMessage.toLowerCase().includes('user is not enabled')) {
            setError('Kite Error: "The user is not enabled for the app." Please go to your Zerodha Developer app settings and add your own Client ID to the list of enabled users.');
          } else {
            setError(errorMessage);
          }
          setStep('credentials');
          authWindow?.close();
          window.removeEventListener('message', handleCallback);
        }
      };

      window.addEventListener('message', handleCallback);
      
      // Cleanup if window is closed manually
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleCallback);
          setIsConnecting(false);
          // If the user closed the window and we were in OAuth step, reset to credentials
          if (step === 'oauth' && !requestToken) {
            setError('Authentication window closed. Please try again.');
            setStep('credentials');
          }
        }
      }, 1000);
      
    } catch (error) {
      setError('Failed to initiate broker connection. Please check your credentials.');
      console.error('Broker connection error:', error);
    } finally {
      // setIsConnecting(false); // This will be set false by setInterval if window closes or after success/error in callback
    }
  };

  const handleCompleteSetup = async () => {
    if (!requestToken) {
      setError('No request token received. Please try the authentication again.');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Step 1: Exchange request token for access token and test connection via backend API
      // This sends all necessary info (api_key, api_secret, request_token, redirect_url) to the backend
      // The backend handles the secure token exchange and connection test with the broker's API.
      const response = await fetch('/api/broker/connect', { // Assuming this is your backend endpoint
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              broker_name: config.broker_name,
              api_key: config.api_key,
              api_secret: config.api_secret,
              request_token: requestToken,
              redirect_url: getRedirectUrl(),
          }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to complete broker setup via backend. Please check server logs.');
      }

      const backendData = await response.json(); 
      const { access_token, user_verification } = backendData; // Expecting access_token and user_verification from backend

      // Step 2: Save verified configuration
      const finalConfig = {
        ...config,
        request_token: requestToken, // Keep request token for potential re-use or debugging
        access_token: access_token, // Store the actual access token obtained from backend
        is_connected: true,
        connection_status: 'connected',
        last_sync: new Date().toISOString(),
        trading_enabled: true,
        user_verification: user_verification // Store the details obtained from the verification
      };

      await onConfigSaved(finalConfig);
      setVerificationData(user_verification); // Set the verification data for display
      setStep('connected');
      
    } catch (error) {
      setError(`Setup failed: ${error.message}. Please verify your API credentials and try again.`);
      console.error('Setup completion error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyRedirectUrl = () => {
    navigator.clipboard.writeText(getRedirectUrl());
    // You could add a toast notification here
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
                  <span dangerouslySetInnerHTML={{ __html: step.replace('IMPORTANT:', '<strong>IMPORTANT:</strong>') }}></span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-800">Required Redirect URL:</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                  {getRedirectUrl()}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyRedirectUrl}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Copy this URL and paste it in your broker app's redirect URL field
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Credentials */}
      {(step === 'credentials' || step === 'oauth') && (
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
                  disabled={step === 'oauth'}
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
                  disabled={step === 'oauth'}
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
              {step === 'credentials' && (
                <Button 
                  onClick={handleCredentialsSubmit}
                  disabled={isConnecting || !config.api_key || !config.api_secret}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
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
                <strong>Step 1:</strong> A new window should have opened with {brokerInfo[config.broker_name].name} login.
              </p>
              <p>
                <strong>Step 2:</strong> Log in with your broker credentials and authorize the application.
              </p>
              <p>
                <strong>Step 3:</strong> You'll be redirected back automatically. If not, copy the request token from the URL.
              </p>
              {requestToken && (
                <div className="mt-4 p-3 bg-white rounded border">
                  <p className="font-medium text-green-800">✓ Request token received successfully!</p>
                  <Button 
                    onClick={handleCompleteSetup}
                    disabled={isConnecting}
                    className="mt-2 bg-green-600 hover:bg-green-700"
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Token Entry (fallback) */}
      {step === 'oauth' && !requestToken && (
        <Card className="trading-card">
          <CardHeader>
            <CardTitle>Manual Token Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              If the automatic process didn't work, you can manually enter the request token from the redirect URL.
            </p>
            <div className="space-y-2">
              <Label htmlFor="manual_token">Request Token</Label>
              <Input
                id="manual_token"
                type="text"
                placeholder="Paste the request token here"
                value={requestToken}
                onChange={(e) => setRequestToken(e.target.value)}
              />
            </div>
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
      {step === 'connected' && verificationData && (
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
                  <p className="text-green-700">{verificationData.user_id}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Name</p>
                  <p className="text-green-700">{verificationData.user_name}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Email</p>
                  <p className="text-green-700">{verificationData.email}</p>
                </div>
                <div>
                  <p className="font-medium text-green-800">Available Cash</p>
                  <p className="text-green-700">₹{typeof verificationData.available_cash === 'number' ? verificationData.available_cash.toLocaleString('en-IN') : 'N/A'}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded border border-green-200">
                <p className="text-xs text-green-600">
                  ✓ Live API connection established and verified with your Zerodha account
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
