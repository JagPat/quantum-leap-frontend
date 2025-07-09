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
import { brokerConnection } from '@/api/functions'; 
import { brokerDisconnect } from '@/api/functions';

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

  useEffect(() => {
    const handleAuthMessage = (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }
        
        if (event.data?.type === 'BROKER_AUTH_SUCCESS') {
            toast({
                title: "Authentication Successful",
                description: "Token received. Please finalize the connection.",
                variant: "success",
            });
            setRequestToken(event.data.requestToken);
            setStep('complete');
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

      const authUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${config.api_key}`;
      const popup = window.open(authUrl, 'brokerAuth', 'width=800,height=600');
      if (!popup) {
        setError("Popup blocked. Please allow popups for this site.");
        toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site and try again.",
            variant: "destructive",
        });
      }
    } catch (e) {
      setError(`Failed to save initial config: ${e.message}`);
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
      console.log("🚀 [Component] Starting authentication via brokerConnection function...");
      
      const apiKey = config.api_key || sessionStorage.getItem('broker_api_key');
      const apiSecret = config.api_secret || sessionStorage.getItem('broker_api_secret');

      if (!apiKey || !apiSecret) {
        throw new Error("API Key or Secret is missing. Please re-enter your credentials.");
      }
      
      const result = await brokerConnection({
        request_token: requestToken,
        api_key: apiKey,
        api_secret: apiSecret
      });
      
      const responseData = result.data;

      if (responseData.success) {
        console.log("✅ [Component] Authentication successful!");
        
        await onConfigSaved({
            ...config,
            ...responseData.data
        });
        
        toast({
            title: "Success",
            description: responseData.data.message || "Broker connected successfully!",
        });

        setStep('connected');
        if(onConnectionComplete) onConnectionComplete();
        
      } else {
        console.error("❌ [Component] Authentication failed:", responseData.data.error_message);
        setError(responseData.data.error_message || "An unknown authentication error occurred.");
        toast({
            title: "Authentication Failed",
            description: responseData.data.error_message || "Please check your credentials and try again.",
            variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("💥 [Component] Error calling brokerConnection function:", error);
      setError(`Function call error: ${error.message}`);
      toast({
            title: "Function Error",
            description: `A critical error occurred: ${error.message}`,
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
            const result = await brokerDisconnect();
            
            if (!result.data.success) {
                throw new Error(result.data.detail || 'Failed to invalidate session on the backend.');
            }

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