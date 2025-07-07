
import React, { useState, useEffect } from "react";
import { BrokerConfig, ImportedPosition, User } from "@/api/entities";
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
  ArrowLeft
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import BrokerSetup from "../components/broker/BrokerSetup";
import PortfolioImport from "../components/broker/PortfolioImport";

export default function BrokerIntegration() {
  const navigate = useNavigate();
  const [brokerConfig, setBrokerConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [importedPositions, setImportedPositions] = useState([]);

  useEffect(() => {
    loadBrokerConfig();
  }, []);

  const loadBrokerConfig = async () => {
    setIsLoading(true);
    try {
      const configs = await BrokerConfig.list();
      if (configs.length > 0) {
        const currentConfig = configs[0];
        setBrokerConfig(currentConfig);
        if (currentConfig.is_connected) {
          setActiveTab('import');
        } else {
          setActiveTab('setup');
        }
      }
      
      const positions = await ImportedPosition.list();
      setImportedPositions(positions);
    } catch (error) {
      console.error("Error loading broker config:", error);
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
      
      setBrokerConfig(savedConfig);
      
      // Update user's broker connection status
      await User.updateMyUserData({
        broker_connected: configData.is_connected,
        broker_type: configData.broker_name
      });
      
      if (configData.is_connected) {
        setActiveTab('import');
      }
    } catch (error) {
      console.error("Error saving broker config:", error);
      // Re-throw the error to ensure the calling component can handle it
      // and update the UI state (e.g., stop the loading spinner).
      throw error;
    }
  };

  const onConnectionComplete = () => {
    loadBrokerConfig();
  };

  const handleImportComplete = async (selectedPositions) => {
    try {
      const positionPromises = selectedPositions.map(position => 
        ImportedPosition.create({
          ...position,
          is_managed_by_ai: true,
          import_source: brokerConfig.broker_name,
          last_price_update: new Date().toISOString()
        })
      );
      
      const importedData = await Promise.all(positionPromises);
      setImportedPositions(prev => [...prev, ...importedData]);
      
      navigate(createPageUrl("Portfolio"));
    } catch (error) {
      console.error("Error importing positions:", error);
    }
  };

  const getConnectionStatus = () => {
    if (!brokerConfig) return { status: 'disconnected', color: 'bg-slate-100 text-slate-600' };
    if (brokerConfig.is_connected) return { status: 'connected', color: 'bg-green-100 text-green-800' };
    if (brokerConfig.connection_status === 'connecting') return { status: 'connecting', color: 'bg-yellow-100 text-yellow-800' };
    if (brokerConfig.connection_status === 'error') return { status: 'error', color: 'bg-red-100 text-red-800' };
    return { status: 'disconnected', color: 'bg-slate-100 text-slate-600' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Settings"))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Broker Integration</h1>
              <p className="text-slate-600 mt-1">Connect your broker and import your portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={connectionStatus.color}>
              {connectionStatus.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
              {connectionStatus.status === 'error' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {connectionStatus.status.charAt(0).toUpperCase() + connectionStatus.status.slice(1)}
            </Badge>
            {brokerConfig?.broker_name && (
              <Badge variant="outline">
                {brokerConfig.broker_name.charAt(0).toUpperCase() + brokerConfig.broker_name.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="trading-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Broker Status</CardTitle>
              <LinkIcon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {brokerConfig?.is_connected ? 'Connected' : 'Not Connected'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {brokerConfig?.broker_name ? `${brokerConfig.broker_name} integration` : 'No broker configured'}
              </p>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Imported Positions</CardTitle>
              <Download className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {importedPositions.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Holdings synced
              </p>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Last Sync</CardTitle>
              <Settings className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {brokerConfig?.last_sync ? 'Today' : 'Never'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Portfolio update
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Broker Setup
            </TabsTrigger>
            <TabsTrigger 
              value="import" 
              className="flex items-center gap-2"
              disabled={!brokerConfig?.is_connected}
            >
              <Download className="w-4 h-4" />
              Portfolio Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-6">
            <BrokerSetup 
              onConfigSaved={handleConfigSaved}
              existingConfig={brokerConfig}
              isLoading={isLoading}
              onConnectionComplete={onConnectionComplete}
            />
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <PortfolioImport 
              onImportComplete={handleImportComplete}
              brokerConfig={brokerConfig}
            />
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="trading-card border-blue-200 bg-blue-50 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Settings className="w-5 h-5" />
              Integration Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>Step 1:</strong> Get your API credentials from your broker's developer portal
              </div>
              <div>
                <strong>Step 2:</strong> Enter your API key and secret in the Broker Setup tab
              </div>
              <div>
                <strong>Step 3:</strong> Complete the OAuth authentication flow with your broker
              </div>
              <div>
                <strong>Step 4:</strong> Import your existing portfolio and enable AI management
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200">
                <strong>Security:</strong> All API credentials are encrypted and stored securely. 
                We never store your broker passwords and cannot access your account without your explicit authorization.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
