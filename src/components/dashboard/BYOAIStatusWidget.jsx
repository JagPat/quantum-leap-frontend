import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  Key,
  Activity
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BYOAIStatusWidget() {
  const { toast } = useToast();
  const [userProvider, setUserProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState({});

  useEffect(() => {
    checkUserProvider();
  }, []);

  const checkUserProvider = async () => {
    try {
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected);
      
      if (activeConfig?.user_data?.user_id) {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/ai/preferences`, {
          headers: {
            'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,
            'X-User-ID': activeConfig.user_data.user_id
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserProvider(data.data?.preferences);
          
          // Check provider status
          const statusResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/ai/status`, {
            headers: {
              'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,
              'X-User-ID': activeConfig.user_data.user_id
            }
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            setProviderStatus(statusData.data?.providers_status || {});
          }
        }
      }
    } catch (err) {
      console.log('Could not fetch user provider:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'openai':
        return '🤖';
      case 'claude':
        return '🧠';
      case 'gemini':
        return '💎';
      default:
        return '⚡';
    }
  };

  const getProviderColor = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'openai':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'claude':
        return 'text-purple-600 bg-purple-100 border-purple-300';
      case 'gemini':
        return 'text-blue-600 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Provider Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Activity className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userProvider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Provider Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No AI provider configured. Configure your AI settings to use BYOAI.
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 w-full"
            onClick={() => window.location.href = '/settings'}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configure AI Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const preferredProvider = userProvider.preferred_ai_provider || 'auto';
  const hasKeys = userProvider.has_openai_key || userProvider.has_claude_key || userProvider.has_gemini_key;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          BYOAI Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preferred Provider */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Preferred Provider:</span>
          <Badge className={getProviderColor(preferredProvider)}>
            <Shield className="h-3 w-3 mr-1" />
            {preferredProvider === 'auto' ? 'Auto Selection' : preferredProvider.toUpperCase()}
          </Badge>
        </div>

        {/* API Keys Status */}
        <div className="space-y-2">
          <span className="text-sm font-medium">API Keys:</span>
          <div className="grid grid-cols-3 gap-2">
            {['openai', 'claude', 'gemini'].map(provider => (
              <div key={provider} className="flex items-center gap-2">
                <span className="text-lg">{getProviderIcon(provider)}</span>
                <div className="flex items-center gap-1">
                  {userProvider[`has_${provider}_key`] ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span className="text-xs capitalize">{provider}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Health */}
        {Object.keys(providerStatus).length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Provider Health:</span>
            <div className="space-y-1">
              {Object.entries(providerStatus).map(([provider, status]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-xs capitalize">{provider}:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(status)}
                    <span className="text-xs">{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.href = '/settings'}
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage AI Settings
          </Button>
        </div>

        {/* Status Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span>Status:</span>
            <Badge variant={hasKeys ? "default" : "destructive"}>
              {hasKeys ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 