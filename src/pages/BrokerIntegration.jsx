
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
  ArrowLeft,
  Wifi,
  WifiOff
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import BrokerSetup from "../components/broker/BrokerSetup";
import PortfolioImport from "../components/broker/PortfolioImport";
import { useToast } from "@/components/ui/use-toast";
import { brokerAPI } from "@/api/functions"; // Import Base44 function for heartbeat

export default function BrokerIntegration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [brokerConfig, setBrokerConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [importedPositions, setImportedPositions] = useState([]);
  const [liveStatus, setLiveStatus] = useState({ state: 'unknown', message: '' });

  useEffect(() => {
    loadBrokerConfig();
  }, []);

  // Re-enabled Heartbeat check with the correct function-based approach
  useEffect(() => {
    let intervalId;

    const checkConnection = async () => {
        if (brokerConfig && brokerConfig.is_connected) {
            setLiveStatus(prev => ({ ...prev, state: 'checking' }));
            
            try {
                // Call the Base44 function, which handles auth securely.
                const result = await brokerAPI({ endpoint: 'profile' });
                const response = result.data;

                if (response && response.status === 'success') {
                    setLiveStatus({ state: 'connected', message: `Live connection confirmed at ${new Date().toLocaleTimeString()}` });
                } else {
                    let errorDetail = response?.detail || 'Connection check failed';
                    if (errorDetail.includes('No active broker session')) {
                        errorDetail = 'Broker session not found. Please reconnect.';
                    } else if (errorDetail.includes('Session expired')) {
                        errorDetail = 'Broker session expired. Please reconnect.';
                    } else if (errorDetail.includes('Invalid JWT token')) {
                        errorDetail = 'Authentication failed. Please log in again.';
                    }
                    throw new Error(errorDetail);
                }
            } catch (error) {
                console.error("Heartbeat check failed:", error.message);
                setLiveStatus({ state: 'disconnected', message: "Connection lost. Please reconnect." });
                
                toast({
                    title: "Broker Connection Lost",
                    description: error.message,
                    variant: "destructive",
                });

                if (intervalId) clearInterval(intervalId); // Stop checking if connection is lost
            }
        }
    };

    // Start heartbeat if broker is connected
    if (brokerConfig && brokerConfig.is_connected) {
        checkConnection(); // Check immediately
        intervalId = setInterval(checkConnection, 60000); // Check every 60 seconds
    } else if (brokerConfig && !brokerConfig.is_connected) {
        setLiveStatus({ state: 'disconnected', message: "Not connected to a broker." });
    } else {
        setLiveStatus({ state: 'unknown', message: "Loading broker configuration..." });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [brokerConfig, toast]);

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
      } else {
        setBrokerConfig(null); // Explicitly set to null if no config found
      }
      
      const positions = await ImportedPosition.list();
      setImportedPositions(positions);
    } catch (error) {
      console.error("Error loading broker config:", error);
      toast({
        title: "Error",
        description: "Failed to load broker configuration.",
        variant: "destructive",
      });
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
      
      await User.updateMyUserData({
        broker_connected: configData.is_connected,
        broker_type: configData.broker_name
      });
      
      if (configData.is_connected) {
        setActiveTab('import');
      }
    } catch (error) {
      console.error("Error saving broker config:", error);
      toast({
        title: "Error",
        description: "Failed to save broker configuration.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to import positions.",
        variant: "destructive",
      });
    }
  };

  const getConnectionStatus = () => {
    // Prioritize explicit liveStatus
    if (liveStatus.state === 'disconnected') return { status: 'Disconnected', color: 'bg-red-100 text-red-800 animate-pulse', icon: <WifiOff className="w-3 h-3 mr-1" /> };
    if (liveStatus.state === 'checking') return { status: 'Checking...', color: 'bg-yellow-100 text-yellow-800 animate-pulse', icon: <Wifi className="w-3 h-3 mr-1" /> };
    if (liveStatus.state === 'connected') return { status: 'Connected', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1" /> };
    
    // Fallback based on config if liveStatus is 'unknown' or not yet determined
    if (brokerConfig?.is_connected) {
      return { status: 'Connected (Config)', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1" /> };
    }
    
    return { status: 'Not Configured', color: 'bg-slate-100 text-slate-600', icon: null };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
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
            <Badge className={`${connectionStatus.color} transition-all`}>
              {connectionStatus.icon}
              {connectionStatus.status}
            </Badge>
            {brokerConfig?.broker_name && (
              <Badge variant="outline">
                {brokerConfig.broker_name.charAt(0).toUpperCase() + brokerConfig.broker_name.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="trading-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Broker Status</CardTitle>
              <LinkIcon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {brokerConfig?.is_connected ? 'Configured' : 'Not Configured'}
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
              <CardTitle className="text-sm font-medium text-slate-600">Live Status</CardTitle>
              {liveStatus.state === 'connected' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {liveStatus.state === 'disconnected' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              {liveStatus.state === 'checking' && <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />}
              {liveStatus.state === 'unknown' && <Settings className="h-4 w-4 text-slate-500" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {liveStatus.state.charAt(0).toUpperCase() + liveStatus.state.slice(1)}
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate" title={liveStatus.message}>
                {liveStatus.message}
              </p>
            </CardContent>
          </Card>
        </div>

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
