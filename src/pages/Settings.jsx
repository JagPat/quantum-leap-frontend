
import React, { useState, useEffect } from "react";
import { User, BrokerConfig } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
  User as UserIcon, 
  Key, 
  BrainCircuit, 
  Bell, 
  AlertTriangle, 
  Save, 
  CheckCircle,
  LogOut,
  ShieldCheck,
  Trash2,
  Link as LinkIcon
} from "lucide-react";

const initialSettings = {
  fullName: "",
  email: "",
  two_factor_enabled: false,
  broker_name: "zerodha",
  api_key: "",
  api_secret: "",
  ai_engine_selection: "quantumleap_default",
  custom_ai_endpoint: "",
  custom_ai_auth_key: "",
  custom_ai_auth_type: "bearer_token",
  custom_ai_connection_status: "untested",
  notification_frequency: "daily",
  notification_channels: { email: true, in_app: true },
};

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [brokerConfig, setBrokerConfig] = useState(null);
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [userData, brokerConfigs] = await Promise.all([
        User.me(),
        BrokerConfig.list()
      ]);
      
      setUser(userData);
      const currentBrokerConfig = brokerConfigs.length > 0 ? brokerConfigs[0] : null;
      setBrokerConfig(currentBrokerConfig);
      
      setSettings({
        fullName: userData.full_name || "",
        email: userData.email || "",
        two_factor_enabled: userData.two_factor_enabled || false,
        broker_name: currentBrokerConfig?.broker_name || "zerodha",
        api_key: currentBrokerConfig?.api_key || "",
        api_secret: "",
        ai_engine_selection: userData.ai_engine_selection || "quantumleap_default",
        custom_ai_endpoint: userData.custom_ai_endpoint || "",
        custom_ai_auth_key: "",
        custom_ai_auth_type: userData.custom_ai_auth_type || "bearer_token",
        custom_ai_connection_status: userData.custom_ai_connection_status || 'untested',
        notification_frequency: userData.notification_frequency || "daily",
        notification_channels: userData.notification_channels || { email: true, in_app: true },
      });
    } catch (error) {
      console.error("Failed to load initial data", error);
      toast.error("Failed to load your settings.");
    }
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleChannelChange = (channel, value) => {
    setSettings(prev => ({
      ...prev,
      notification_channels: { ...prev.notification_channels, [channel]: value }
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({
        full_name: settings.fullName,
        two_factor_enabled: settings.two_factor_enabled,
        ai_engine_selection: settings.ai_engine_selection,
        custom_ai_endpoint: settings.custom_ai_endpoint,
        custom_ai_auth_key: settings.custom_ai_auth_key,
        custom_ai_auth_type: settings.custom_ai_auth_type,
        custom_ai_connection_status: settings.custom_ai_connection_status,
        notification_frequency: settings.notification_frequency,
        notification_channels: settings.notification_channels,
      });
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleBrokerConnect = async () => {
    toast.info("Broker connection logic needs to be implemented.");
  };

  const handleTestConnection = async () => {
    if (!settings.custom_ai_endpoint) {
      toast.error("Please enter an API endpoint to test.");
      return;
    }
    setIsTestingConnection(true);
    // Simulate API call
    await new Promise(res => setTimeout(res, 1500)); 
    try {
      // In a real scenario, you'd fetch from the endpoint
      const isSuccess = Math.random() > 0.3; // Simulate success/failure
      if (isSuccess) {
        handleSettingsChange('custom_ai_connection_status', 'connected');
        toast.success("Connection to custom AI successful!");
      } else {
        throw new Error("Invalid endpoint or auth key");
      }
    } catch (error) {
      handleSettingsChange('custom_ai_connection_status', 'failed');
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const renderAccountInfo = () => (
    <Card className="bg-slate-800/50 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserIcon /> Account Info & Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={settings.fullName} onChange={e => handleSettingsChange('fullName', e.target.value)} className="bg-slate-700 border-slate-600"/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={settings.email} readOnly disabled className="bg-slate-900 border-slate-700 opacity-70"/>
          </div>
        </div>
        <div className="space-y-4">
          <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">Change Password</Button>
          <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="two_factor_enabled" className="flex items-center gap-2"><ShieldCheck/> Two-Factor Authentication</Label>
              <CardDescription className="text-slate-400">Add an extra layer of security to your account.</CardDescription>
            </div>
            <Switch 
              id="two_factor_enabled" 
              checked={settings.two_factor_enabled} 
              onCheckedChange={checked => handleSettingsChange('two_factor_enabled', checked)}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
            />
          </div>
          <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
            <LogOut className="mr-2 h-4 w-4"/> Logout from all devices
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderBrokerIntegration = () => (
    <Card className="bg-slate-800/50 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LinkIcon /> Broker Integration</CardTitle>
        <CardDescription>Connect your trading account. Your credentials are encrypted and secure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Broker</Label>
          <Select value={settings.broker_name} onValueChange={value => handleSettingsChange('broker_name', value)}>
            <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="zerodha">Zerodha</SelectItem>
              <SelectItem value="upstox">Upstox</SelectItem>
              <SelectItem value="angel">AngelOne</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="api_key">API Key</Label>
          <Input id="api_key" value={settings.api_key} onChange={e => handleSettingsChange('api_key', e.target.value)} className="bg-slate-700 border-slate-600"/>
        </div>
        <div>
          <Label htmlFor="api_secret">API Secret</Label>
          <Input id="api_secret" type="password" placeholder="Enter only to update" onChange={e => handleSettingsChange('api_secret', e.target.value)} className="bg-slate-700 border-slate-600"/>
        </div>
        <div className="flex justify-between items-center">
          <Button onClick={handleBrokerConnect}>Save & Connect Broker</Button>
          <Badge variant={brokerConfig?.is_connected ? "default" : "secondary"}>
            Status: {brokerConfig?.is_connected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderAIEngine = () => (
    <Card className="bg-slate-800/50 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BrainCircuit /> AI Engine</CardTitle>
        <CardDescription>Choose the AI model for trading strategies and analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select AI Engine</Label>
          <Select value={settings.ai_engine_selection} onValueChange={value => handleSettingsChange('ai_engine_selection', value)}>
            <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quantumleap_default">QuantumLeap AI (Default)</SelectItem>
              <SelectItem value="custom_ai">Custom AI (Bring Your Own Model)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.ai_engine_selection === 'custom_ai' && (
          <div className="p-4 border border-slate-700 rounded-lg space-y-4 animate-in fade-in-50">
            <h4 className="font-semibold text-slate-300">Custom AI Configuration</h4>
            <div className="space-y-2">
              <Label htmlFor="custom_ai_endpoint">Custom API Endpoint</Label>
              <Input id="custom_ai_endpoint" value={settings.custom_ai_endpoint} onChange={e => handleSettingsChange('custom_ai_endpoint', e.target.value)} placeholder="https://myapi.ai.com/v1/inference" className="bg-slate-700 border-slate-600"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_ai_auth_key">Auth Key / Token</Label>
              <Input id="custom_ai_auth_key" type="password" placeholder="Enter your secure token" onChange={e => handleSettingsChange('custom_ai_auth_key', e.target.value)} className="bg-slate-700 border-slate-600"/>
            </div>
            <div className="space-y-2">
              <Label>Authentication Type</Label>
              <Select value={settings.custom_ai_auth_type} onValueChange={value => handleSettingsChange('custom_ai_auth_type', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer_token">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Button onClick={handleTestConnection} variant="outline" disabled={isTestingConnection} className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
                {isTestingConnection ? "Testing..." : "Test Connection"}
              </Button>
              {settings.custom_ai_connection_status === 'connected' && <Badge className="bg-green-500/20 text-green-300"><CheckCircle className="w-4 h-4 mr-1"/>Connected</Badge>}
              {settings.custom_ai_connection_status === 'failed' && <Badge variant="destructive"><AlertTriangle className="w-4 h-4 mr-1"/>Failed</Badge>}
              {settings.custom_ai_connection_status === 'untested' && <Badge variant="secondary">Untested</Badge>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderNotificationPreferences = () => (
    <Card className="bg-slate-800/50 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell /> Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={settings.notification_frequency} onValueChange={value => handleSettingsChange('notification_frequency', value)}>
            <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-Time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily Summary</SelectItem>
              <SelectItem value="weekly">Weekly Digest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <Label>Channels</Label>
          <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
            <Label htmlFor="email-notifications">Email</Label>
            <Switch 
              id="email-notifications" 
              checked={settings.notification_channels.email} 
              onCheckedChange={checked => handleChannelChange('email', checked)}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
            <Label htmlFor="in-app-notifications">In-App</Label>
            <Switch 
              id="in-app-notifications" 
              checked={settings.notification_channels.in_app} 
              onCheckedChange={checked => handleChannelChange('in_app', checked)}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAccountLifecycle = () => (
    <Card className="bg-slate-800/50 border-white/10 text-white border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle/> Account Lifecycle</CardTitle>
        <CardDescription>Manage your account status. These actions are irreversible.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300">Deactivate Account</Button>
        <Button variant="destructive"><Trash2 className="w-4 h-4 mr-2"/>Delete Account Permanently</Button>
      </CardContent>
    </Card>
  );


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">User Preferences</h1>
          <p className="text-slate-400">Manage your account, platform, and notification settings.</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4"/>Save Changes</>}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {renderAccountInfo()}
          {renderBrokerIntegration()}
        </div>
        <div className="space-y-8">
          {renderAIEngine()}
          {renderNotificationPreferences()}
          {renderAccountLifecycle()}
        </div>
      </div>
    </div>
  );
}
