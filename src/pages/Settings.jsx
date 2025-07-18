
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon,
  Bot,
  Shield,
  Database,
  Bell,
  Palette,
  Key,
  Link,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import AISettingsForm from '@/components/settings/AISettingsForm';
import BrokerIntegration from './BrokerIntegration';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('ai');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Configure your trading platform preferences</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="border-green-200 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                System Healthy
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-xl shadow-sm p-1">
            <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Bot className="w-4 h-4 mr-2" />
              AI Engine
            </TabsTrigger>
            <TabsTrigger value="broker" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Link className="w-4 h-4 mr-2" />
              Broker
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* AI Engine Settings */}
          <TabsContent value="ai" className="space-y-6">
            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Engine Configuration
                </CardTitle>
                <CardDescription>
                  Configure AI providers for portfolio analysis and trading decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AISettingsForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broker Integration Settings */}
          <TabsContent value="broker" className="space-y-6">
            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Broker Integration
                </CardTitle>
                <CardDescription>
                  Connect your broker account for live portfolio data and trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrokerIntegration />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your account security and data privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Session Management</h4>
                      <p className="text-sm text-gray-600">View and manage active sessions</p>
                    </div>
                    <Button variant="outline">Manage Sessions</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Export</h4>
                      <p className="text-sm text-gray-600">Download your portfolio and trading data</p>
                    </div>
                    <Button variant="outline">Export Data</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Trading Alerts</h4>
                      <p className="text-sm text-gray-600">Get notified about important trading events</p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Portfolio Updates</h4>
                      <p className="text-sm text-gray-600">Daily portfolio summary and performance updates</p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">AI Insights</h4>
                      <p className="text-sm text-gray-600">AI-generated trading recommendations and alerts</p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance & Theme
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your trading platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Theme</h4>
                      <p className="text-sm text-gray-600">Choose between light and dark themes</p>
                    </div>
                    <Button variant="outline">Light Theme</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Dashboard Layout</h4>
                      <p className="text-sm text-gray-600">Customize your dashboard layout and widgets</p>
                    </div>
                    <Button variant="outline">Customize</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Display</h4>
                      <p className="text-sm text-gray-600">Configure how financial data is displayed</p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
