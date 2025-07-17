
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { BrokerConfig } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings as SettingsIcon, Link as LinkIcon, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import ErrorBoundary from '../components/ErrorBoundary';
import AISettingsForm from '../components/settings/AISettingsForm';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [brokerConfig, setBrokerConfig] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use the correct User method
      const userData = User.getCurrentUser();
      setUser(userData);
      
      // Mock broker config for development - in production this would come from backend
      const mockBrokerConfig = {
        id: 'local_config',
        broker_name: 'Zerodha Kite',
        is_connected: false,
        created_at: new Date().toISOString()
      };
      setBrokerConfig(mockBrokerConfig);
      
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Could not load settings data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-500" />
          <p className="text-white">Loading Settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center text-red-400">
          <p>{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Configure your trading account, AI preferences, and system settings</p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="account" className="data-[state=active]:bg-slate-700">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-slate-700">
              <Bot className="w-4 h-4 mr-2" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="broker" className="data-[state=active]:bg-slate-700">
              <LinkIcon className="w-4 h-4 mr-2" />
              Broker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            {/* Account Information Card */}
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Name</Label>
                  <Input 
                    value={user?.name || "Development User"} 
                    readOnly 
                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Email</Label>
                  <Input 
                    value={user?.email || "local@development.com"} 
                    readOnly 
                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-blue-900/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-300">Account Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-blue-200">
                  <p>• Your account information is managed by the authentication system</p>
                  <p>• All personal data is stored securely and encrypted</p>
                  <p>• Contact support for account-related changes or issues</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AISettingsForm />
          </TabsContent>

          <TabsContent value="broker" className="space-y-6">
            {/* Broker Configuration Card */}
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Broker Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300">Connection Status:</span>
                  <Badge variant={brokerConfig?.is_connected ? "default" : "secondary"}>
                    {brokerConfig?.is_connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>

                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 mb-3">
                    For detailed broker setup, configuration, and portfolio import:
                  </p>
                  <Link 
                    to="/broker-integration"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Go to Broker Integration
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Broker Help Section */}
            <Card className="bg-blue-900/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-300">Broker Help</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-blue-200">
                  <p>• Use the Broker Integration page for complete broker setup</p>
                  <p>• All broker credentials are encrypted and stored securely</p>
                  <p>• Contact support if you encounter any connection issues</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
