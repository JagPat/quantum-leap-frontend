
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { BrokerConfig } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings as SettingsIcon, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ErrorBoundary from '../components/ErrorBoundary';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [brokerConfig, setBrokerConfig] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      const configs = await BrokerConfig.list();
      if (configs.length > 0) {
        setBrokerConfig(configs[0]);
      } else {
        setBrokerConfig(null);
      }
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
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Configure your trading account and preferences</p>
        </div>

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
                value={user?.full_name || ""} 
                readOnly 
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input 
                value={user?.email || ""} 
                readOnly 
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Broker Configuration Card - SIMPLIFIED */}
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
                to={createPageUrl("BrokerIntegration")}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Go to Broker Integration
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-300">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-200">
              <p>• Use the Broker Integration page for complete broker setup</p>
              <p>• All broker credentials are encrypted and stored securely</p>
              <p>• Contact support if you encounter any connection issues</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
