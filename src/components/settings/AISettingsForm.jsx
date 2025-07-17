import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Trash2,
  Shield
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { railwayAPI } from '@/api/railwayAPI';

const AI_PROVIDERS = [
  { value: 'auto', label: 'Auto (Recommended)', description: 'Let the system choose the best provider for each task' },
  { value: 'openai', label: 'OpenAI (GPT-4)', description: 'Best for strategy generation and complex analysis' },
  { value: 'claude', label: 'Claude (Anthropic)', description: 'Excellent for technical analysis and reasoning' },
  { value: 'gemini', label: 'Google Gemini', description: 'Great for market sentiment and data analysis' }
];

export default function AISettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState({});
  
  // Form state
  const [preferences, setPreferences] = useState({
    preferred_ai_provider: 'auto',
    openai_api_key: '',
    claude_api_key: '',
    gemini_api_key: ''
  });
  
  // Current settings state (from server)
  const [currentSettings, setCurrentSettings] = useState({
    preferred_ai_provider: 'auto',
    has_openai_key: false,
    has_claude_key: false,
    has_gemini_key: false,
    openai_key_preview: '',
    claude_key_preview: '',
    gemini_key_preview: ''
  });
  
  // UI state
  const [showKeys, setShowKeys] = useState({
    openai: false,
    claude: false,
    gemini: false
  });
  const [validateBeforeSaving, setValidateBeforeSaving] = useState(true);
  const [validationResults, setValidationResults] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  useEffect(() => {
    // Check if there are any changes
    const hasPreferenceChange = preferences.preferred_ai_provider !== currentSettings.preferred_ai_provider;
    const hasKeyChanges = preferences.openai_api_key || preferences.claude_api_key || preferences.gemini_api_key;
    setHasChanges(hasPreferenceChange || hasKeyChanges);
  }, [preferences, currentSettings]);

  const loadCurrentSettings = async () => {
    setLoading(true);
    try {
      const response = await railwayAPI.request('/ai/preferences');
      if (response.status === 'success' && response.data?.preferences) {
        setCurrentSettings(response.data.preferences);
        setPreferences(prev => ({
          ...prev,
          preferred_ai_provider: response.data.preferences.preferred_ai_provider || 'auto'
        }));
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast({
        title: "Error",
        description: "Failed to load current AI settings.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const validateApiKey = async (provider, apiKey) => {
    if (!apiKey.trim()) return { valid: false, message: 'API key is required' };
    
    setValidating(prev => ({ ...prev, [provider]: true }));
    try {
      const response = await railwayAPI.request('/ai/validate-key', {
        method: 'POST',
        body: JSON.stringify({
          provider: provider,
          api_key: apiKey
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = {
        valid: response.data?.valid || false,
        message: response.data?.message || 'Validation failed'
      };
      
      setValidationResults(prev => ({ ...prev, [provider]: result }));
      return result;
    } catch (error) {
      const result = { valid: false, message: 'Validation request failed' };
      setValidationResults(prev => ({ ...prev, [provider]: result }));
      return result;
    } finally {
      setValidating(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleKeyChange = (provider, value) => {
    setPreferences(prev => ({
      ...prev,
      [`${provider}_api_key`]: value
    }));
    
    // Clear previous validation results when key changes
    if (validationResults[provider]) {
      setValidationResults(prev => {
        const newResults = { ...prev };
        delete newResults[provider];
        return newResults;
      });
    }
  };

  const handleValidateKey = async (provider) => {
    const apiKey = preferences[`${provider}_api_key`];
    if (!apiKey) {
      toast({
        title: "Validation Error",
        description: "Please enter an API key first.",
        variant: "destructive",
      });
      return;
    }

    const result = await validateApiKey(provider, apiKey);
    
    toast({
      title: result.valid ? "Key Valid" : "Key Invalid",
      description: result.message,
      variant: result.valid ? "default" : "destructive",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate keys if option is enabled and there are new keys
      if (validateBeforeSaving) {
        const keysToValidate = [];
        if (preferences.openai_api_key) keysToValidate.push('openai');
        if (preferences.claude_api_key) keysToValidate.push('claude');
        if (preferences.gemini_api_key) keysToValidate.push('gemini');
        
        for (const provider of keysToValidate) {
          if (!validationResults[provider]?.valid) {
            const result = await validateApiKey(provider, preferences[`${provider}_api_key`]);
            if (!result.valid) {
              toast({
                title: "Validation Failed",
                description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key validation failed: ${result.message}`,
                variant: "destructive",
              });
              setSaving(false);
              return;
            }
          }
        }
      }

      // Save preferences
      const requestBody = {
        preferred_ai_provider: preferences.preferred_ai_provider,
        openai_api_key: preferences.openai_api_key || null,
        claude_api_key: preferences.claude_api_key || null,
        gemini_api_key: preferences.gemini_api_key || null
      };

      const response = await railwayAPI.request('/ai/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 'success') {
        toast({
          title: "Settings Saved",
          description: "Your AI preferences have been saved successfully.",
        });
        
        // Clear form and reload current settings
        setPreferences(prev => ({
          ...prev,
          openai_api_key: '',
          claude_api_key: '',
          gemini_api_key: ''
        }));
        setValidationResults({});
        await loadCurrentSettings();
      } else {
        throw new Error(response.data?.message || 'Save failed');
      }
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save AI preferences.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all AI settings? This will remove all your API keys and reset preferences.')) {
      return;
    }

    try {
      const response = await railwayAPI.request('/ai/preferences', {
        method: 'DELETE'
      });

      if (response.status === 'success') {
        toast({
          title: "Settings Cleared",
          description: "All AI preferences have been cleared.",
        });
        
        setPreferences({
          preferred_ai_provider: 'auto',
          openai_api_key: '',
          claude_api_key: '',
          gemini_api_key: ''
        });
        setValidationResults({});
        await loadCurrentSettings();
      } else {
        throw new Error(response.data?.message || 'Clear failed');
      }
    } catch (error) {
      console.error('Failed to clear AI settings:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear AI preferences.",
        variant: "destructive",
      });
    }
  };

  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const getKeyStatusBadge = (provider) => {
    const hasKey = currentSettings[`has_${provider}_key`];
    const preview = currentSettings[`${provider}_key_preview`];
    
    if (hasKey && preview) {
      return (
        <Badge variant="secondary" className="ml-2">
          <Key className="w-3 h-3 mr-1" />
          {preview}
        </Badge>
      );
    }
    return null;
  };

  const getValidationIcon = (provider) => {
    if (validating[provider]) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    const result = validationResults[provider];
    if (!result) return null;
    
    return result.valid ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading AI settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Provider Settings
        </CardTitle>
        <CardDescription>
          Configure your personal AI provider preferences and API keys for enhanced trading analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Notice */}
        <Alert>
          <Shield className="w-4 h-4" />
          <AlertDescription>
            Your API keys are encrypted and stored securely. They are never exposed in the frontend after saving.
          </AlertDescription>
        </Alert>

        {/* Provider Preference */}
        <div className="space-y-3">
          <Label htmlFor="provider-select" className="text-base font-medium">
            Preferred AI Provider
          </Label>
          <Select
            value={preferences.preferred_ai_provider}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_ai_provider: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your preferred provider" />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{provider.label}</span>
                    <span className="text-sm text-muted-foreground">{provider.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* API Keys Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">API Keys</h3>
            <div className="flex items-center space-x-2">
              <Switch
                checked={validateBeforeSaving}
                onCheckedChange={setValidateBeforeSaving}
              />
              <Label htmlFor="validate-keys" className="text-sm">
                Validate keys before saving
              </Label>
            </div>
          </div>

          {/* OpenAI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="openai-key" className="flex items-center gap-2">
                OpenAI API Key
                {getKeyStatusBadge('openai')}
              </Label>
              <div className="flex items-center gap-2">
                {getValidationIcon('openai')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleValidateKey('openai')}
                  disabled={!preferences.openai_api_key || validating.openai}
                >
                  Test
                </Button>
              </div>
            </div>
            <div className="relative">
              <Input
                id="openai-key"
                type={showKeys.openai ? "text" : "password"}
                placeholder="sk-..."
                value={preferences.openai_api_key}
                onChange={(e) => handleKeyChange('openai', e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => toggleKeyVisibility('openai')}
              >
                {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {validationResults.openai && (
              <p className={`text-sm ${validationResults.openai.valid ? 'text-green-600' : 'text-red-600'}`}>
                {validationResults.openai.message}
              </p>
            )}
          </div>

          {/* Claude */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="claude-key" className="flex items-center gap-2">
                Claude API Key
                {getKeyStatusBadge('claude')}
              </Label>
              <div className="flex items-center gap-2">
                {getValidationIcon('claude')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleValidateKey('claude')}
                  disabled={!preferences.claude_api_key || validating.claude}
                >
                  Test
                </Button>
              </div>
            </div>
            <div className="relative">
              <Input
                id="claude-key"
                type={showKeys.claude ? "text" : "password"}
                placeholder="sk-ant-..."
                value={preferences.claude_api_key}
                onChange={(e) => handleKeyChange('claude', e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => toggleKeyVisibility('claude')}
              >
                {showKeys.claude ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {validationResults.claude && (
              <p className={`text-sm ${validationResults.claude.valid ? 'text-green-600' : 'text-red-600'}`}>
                {validationResults.claude.message}
              </p>
            )}
          </div>

          {/* Gemini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini-key" className="flex items-center gap-2">
                Gemini API Key
                {getKeyStatusBadge('gemini')}
              </Label>
              <div className="flex items-center gap-2">
                {getValidationIcon('gemini')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleValidateKey('gemini')}
                  disabled={!preferences.gemini_api_key || validating.gemini}
                >
                  Test
                </Button>
              </div>
            </div>
            <div className="relative">
              <Input
                id="gemini-key"
                type={showKeys.gemini ? "text" : "password"}
                placeholder="AI..."
                value={preferences.gemini_api_key}
                onChange={(e) => handleKeyChange('gemini', e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => toggleKeyVisibility('gemini')}
              >
                {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {validationResults.gemini && (
              <p className={`text-sm ${validationResults.gemini.valid ? 'text-green-600' : 'text-red-600'}`}>
                {validationResults.gemini.message}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleClearAll}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Settings
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={loadCurrentSettings}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Need API keys?</strong><br />
            • OpenAI: Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a><br />
            • Claude: Visit <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a><br />
            • Gemini: Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 