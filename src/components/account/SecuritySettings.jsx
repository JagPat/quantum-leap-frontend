import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Key, 
  Smartphone, 
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";

export default function SecuritySettings({ user, onUpdate }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const handleGenerateAPIKey = async () => {
    setIsGeneratingKey(true);
    // Simulate API key generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGeneratingKey(false);
    alert('New API key generated! Please save it securely.');
  };

  const securityScore = () => {
    let score = 0;
    if (user?.broker_connected) score += 25;
    if (twoFactorEnabled) score += 25;
    if (user?.trading_mode === 'sandbox') score += 25;
    if (user?.email?.includes('@')) score += 25;
    return score;
  };

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Score
            </span>
            <Badge 
              className={`${
                securityScore() >= 75 
                  ? 'bg-green-100 text-green-800' 
                  : securityScore() >= 50 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {securityScore()}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Verified</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Broker Connected</span>
              {user?.broker_connected ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Two-Factor Authentication</span>
              {twoFactorEnabled ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Safe Trading Mode</span>
              {user?.trading_mode === 'sandbox' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable 2FA</p>
              <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
          
          {twoFactorEnabled && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is enabled. You'll receive a code on your phone for login.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* API Key Management */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Key Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Personal API Key</Label>
            <div className="flex gap-2">
              <Input
                type={apiKeyVisible ? "text" : "password"}
                value="ak_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
              >
                {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Use this key for programmatic access to your account data
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={handleGenerateAPIKey}
              disabled={isGeneratingKey}
            >
              {isGeneratingKey ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Key
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-slate-500">Chrome on Windows • India</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-800">
                Active Now
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Mobile App</p>
                <p className="text-sm text-slate-500">iPhone • Last seen 2 hours ago</p>
              </div>
              <Button variant="outline" size="sm">
                Revoke
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card className="trading-card border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-amber-800">
            {!twoFactorEnabled && (
              <p>• Enable two-factor authentication for better account security</p>
            )}
            {user?.trading_mode === 'live' && (
              <p>• Review your trading limits and stop-loss settings regularly</p>
            )}
            <p>• Never share your API keys or login credentials with anyone</p>
            <p>• Monitor your account activity and report suspicious behavior</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}