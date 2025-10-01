import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Shield,
  Info,
  Sparkles,
  Zap,
  Brain,
  Globe,
  Activity
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { railwayAPI } from '@/api/railwayAPI';

const AI_PROVIDERS = [
  { 
    value: 'auto', 
    label: 'Smart Auto-Selection', 
    description: 'System automatically chooses the best available provider for each task',
    icon: Sparkles,
    benefits: ['No configuration needed', 'Uses your best available API', 'Automatic fallback']
  },
  { 
    value: 'openai', 
    label: 'OpenAI GPT-4', 
    description: 'Best for strategy generation and complex analysis',
    icon: Brain,
    benefits: ['Most advanced reasoning', 'Best for complex strategies', 'Widely supported']
  },
  { 
    value: 'claude', 
    label: 'Claude (Anthropic)', 
    description: 'Excellent for technical analysis and reasoning',
    icon: Zap,
    benefits: ['Strong technical analysis', 'Good for risk assessment', 'Fast responses']
  },
  { 
    value: 'gemini', 
    label: 'Google Gemini', 
    description: 'Great for market sentiment and data analysis',
    icon: Globe,
    benefits: ['Good market insights', 'Cost-effective', 'Fast processing']
  }
];

export default function AISettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState({});
  const [activeTab, setActiveTab] = useState('setup');
  
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
  
  // Ref to track validation timeouts
  const validationTimeouts = useRef({});

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts.current).forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };
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
      console.log('🔧 [AISettingsForm] Loading current AI settings...');
      
      // Get active session from single source of truth
      const { brokerSessionStore } = await import('@/api/sessionStore');
      const activeSession = brokerSessionStore.load();
      
      const activeConfig = activeSession && activeSession.sessionStatus === 'connected' ? {
        user_data: activeSession.user_data,
        config_id: activeSession.config_id,
        is_connected: true
      } : null;

      if (!activeConfig) {
        console.warn('🔧 [AISettingsForm] No active broker config found');
        toast({
          title: "Authentication Required",
          description: "Please connect to your broker first to configure AI settings.",
          variant: "destructive",
        });
        setCurrentSettings({
          preferred_ai_provider: 'auto',
          has_openai_key: false,
          has_claude_key: false,
          has_gemini_key: false,
          openai_key_preview: '',
          claude_key_preview: '',
          gemini_key_preview: ''
        });
        setLoading(false);
        return;
      }

      const userId = activeConfig.user_data?.user_id || activeSession.broker_user_id;
      console.log('🔧 [AISettingsForm] Loading settings for user:', userId);

      const response = await railwayAPI.request('/api/ai/preferences', {
        method: 'GET',
        headers: {
          'X-User-ID': userId,
          'X-Config-ID': activeConfig.config_id
        }
      });

      console.log('🔧 [AISettingsForm] AI preferences response:', response);

      if (response.status === 'success' && response.preferences) {
        const prefs = response.preferences;
        setCurrentSettings({
          preferred_ai_provider: prefs.preferred_ai_provider || 'auto',
          has_openai_key: !!prefs.has_openai_key,
          has_claude_key: !!prefs.has_claude_key,
          has_gemini_key: !!prefs.has_gemini_key,
          openai_key_preview: prefs.openai_key_preview || '',
          claude_key_preview: prefs.claude_key_preview || '',
          gemini_key_preview: prefs.gemini_key_preview || ''
        });
        
        setPreferences(prev => ({
          ...prev,
          preferred_ai_provider: prefs.preferred_ai_provider || 'auto'
        }));
        
        console.log('✅ [AISettingsForm] Settings loaded successfully');
      } else if (response.status === 'no_key') {
        console.log('⚠️ [AISettingsForm] No AI keys configured yet');
        setCurrentSettings({
          preferred_ai_provider: 'auto',
          has_openai_key: false,
          has_claude_key: false,
          has_gemini_key: false,
          openai_key_preview: '',
          claude_key_preview: '',
          gemini_key_preview: ''
        });
      } else {
        console.warn('🔧 [AISettingsForm] Unexpected response status:', response.status);
        setCurrentSettings({
          preferred_ai_provider: 'auto',
          has_openai_key: false,
          has_claude_key: false,
          has_gemini_key: false,
          openai_key_preview: '',
          claude_key_preview: '',
          gemini_key_preview: ''
        });
      }
    } catch (error) {
      console.error('❌ [AISettingsForm] Failed to load AI settings:', error);
      toast({
        title: "Error",
        description: "Failed to load current AI settings. Please check your connection.",
        variant: "destructive",
      });
      setCurrentSettings({
        preferred_ai_provider: 'auto',
        has_openai_key: false,
        has_claude_key: false,
        has_gemini_key: false,
        openai_key_preview: '',
        claude_key_preview: '',
        gemini_key_preview: ''
      });
    }
    setLoading(false);
  };

  const validateApiKey = async (provider, apiKey) => {
    if (!apiKey.trim()) return { valid: false, message: 'API key is required' };
    
    setValidating(prev => ({ ...prev, [provider]: true }));
    try {
      const response = await railwayAPI.request('/api/ai/validate-key', {
        method: 'POST',
        body: JSON.stringify({
          provider: provider,
          api_key: apiKey
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`🔍 [validateApiKey] ${provider} response:`, response);
      
      // Backend returns direct response: { valid: boolean, provider: string, message: string }
      const result = {
        valid: response.valid || false,
        message: response.message || 'Validation failed'
      };
      
      console.log(`🔍 [validateApiKey] ${provider} result:`, result);
      
      setValidationResults(prev => ({ ...prev, [provider]: result }));
      return result;
    } catch (error) {
      console.error(`❌ [validateApiKey] ${provider} error:`, error);
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

    // Clear any existing timeout for this provider
    if (validationTimeouts.current[provider]) {
      clearTimeout(validationTimeouts.current[provider]);
    }

    // Auto-validate if key looks complete and validateBeforeSaving is enabled
    if (validateBeforeSaving && value.trim() && value.length > 20) {
      // Debounce validation to avoid too many API calls
      validationTimeouts.current[provider] = setTimeout(() => {
        console.log(`🔍 [handleKeyChange] Auto-validating ${provider} key`);
        validateApiKey(provider, value);
      }, 1000);
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
      console.log('💾 [AISettingsForm] Saving AI preferences...');
      
      // Get active session from single source of truth
      const { brokerSessionStore } = await import('@/api/sessionStore');
      const activeSession = brokerSessionStore.load();
      
      // Check session using camelCase properties (load() returns camelCase interface)
      if (!activeSession || activeSession.sessionStatus !== 'connected') {
        console.error('[AISettingsForm] Session check failed:', {
          hasSession: !!activeSession,
          sessionStatus: activeSession?.sessionStatus,
          session: activeSession
        });
        throw new Error('No active broker connection found');
      }

      // Use camelCase properties from load() interface
      const userId = activeSession.userId || activeSession.userData?.user_id;
      const configId = activeSession.configId;

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

      // Save preferences - only include keys that are actually provided
      const requestBody = {
        preferred_ai_provider: preferences.preferred_ai_provider,
        openai_api_key: preferences.openai_api_key?.trim() || null,
        claude_api_key: preferences.claude_api_key?.trim() || null,
        gemini_api_key: preferences.gemini_api_key?.trim() || null
      };

      // Check if at least one key is provided
      const hasAnyKey = requestBody.openai_api_key || requestBody.claude_api_key || requestBody.gemini_api_key;
      if (!hasAnyKey) {
        toast({
          title: "No API Key",
          description: "Please provide at least one API key to save preferences.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      console.log('💾 [AISettingsForm] Saving preferences for user:', userId);

      const response = await railwayAPI.request('/api/ai/preferences', {
        method: 'POST',
        headers: {
          'X-User-ID': userId,
          'X-Config-ID': configId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('💾 [AISettingsForm] Save response:', response);

      if (response.status === 'success') {
        toast({
          title: "Success",
          description: "AI settings saved successfully!",
        });
        await loadCurrentSettings(); // Refresh current settings
      } else {
        console.error('💾 [AISettingsForm] Save failed with status:', response.status, 'message:', response.message);
        throw new Error(response.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('❌ [AISettingsForm] Failed to save AI settings:', error);
      toast({
        title: "Error",
        description: "Failed to save AI settings. Please try again.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all AI settings? This will remove all API keys and reset to defaults.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await railwayAPI.request('/api/ai/preferences', {
        method: 'POST',
        body: JSON.stringify({
          preferred_ai_provider: 'auto',
          openai_api_key: "",
          claude_api_key: "",
          gemini_api_key: ""
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 'success') {
        toast({
          title: "Success",
          description: "All AI settings cleared successfully!",
        });
        setPreferences({
          preferred_ai_provider: 'auto',
          openai_api_key: '',
          claude_api_key: '',
          gemini_api_key: ''
        });
        setValidationResults({});
        await loadCurrentSettings();
      }
    } catch (error) {
      console.error('Failed to clear AI settings:', error);
      toast({
        title: "Error",
        description: "Failed to clear AI settings.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getKeyStatusBadge = (provider) => {
    const hasKey = currentSettings[`has_${provider}_key`];
    const isValid = validationResults[provider]?.valid;
    
    if (isValid) {
      return <Badge variant="outline" className="border-green-200 text-green-700">Valid</Badge>;
    } else if (hasKey) {
      return <Badge variant="outline" className="border-yellow-200 text-yellow-700">Configured</Badge>;
    }
    return <Badge variant="outline" className="border-gray-200 text-gray-500">Not Set</Badge>;
  };

  const getValidationIcon = (provider) => {
    const result = validationResults[provider];
    if (!result) return null;
    
    return result.valid ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getAvailableProviders = () => {
    const available = [];
    // Check both saved settings and current validation results
    if (currentSettings.has_openai_key || validationResults.openai?.valid) available.push('OpenAI');
    if (currentSettings.has_claude_key || validationResults.claude?.valid) available.push('Claude');
    if (currentSettings.has_gemini_key || validationResults.gemini?.valid) available.push('Gemini');
    return available;
  };

  const getSetupStatus = () => {
    const available = getAvailableProviders();
    const savedCount = [currentSettings.has_openai_key, currentSettings.has_claude_key, currentSettings.has_gemini_key].filter(Boolean).length;
    const validCount = Object.values(validationResults).filter(result => result?.valid).length;
    
    if (available.length === 0) {
      return { status: 'not-configured', message: 'No API keys configured', color: 'text-red-600' };
    } else if (available.length === 1) {
      const provider = available[0];
      const isValid = validationResults[provider.toLowerCase()]?.valid;
      const isSaved = currentSettings[`has_${provider.toLowerCase()}_key`];
      
      if (isValid && !isSaved) {
        return { status: 'basic', message: `${provider} key validated (not saved)`, color: 'text-yellow-600' };
      } else if (isValid && isSaved) {
        return { status: 'basic', message: `Using ${provider}`, color: 'text-green-600' };
      } else {
        return { status: 'basic', message: `Using ${provider}`, color: 'text-yellow-600' };
      }
    } else {
      if (validCount > savedCount) {
        return { status: 'optimal', message: `${available.length} providers available (${validCount} validated, ${savedCount} saved)`, color: 'text-green-600' };
      } else {
        return { status: 'optimal', message: `${available.length} providers available`, color: 'text-green-600' };
      }
    }
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

  const setupStatus = getSetupStatus();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Configuration
        </CardTitle>
        <CardDescription>
          Configure your AI providers for enhanced trading analysis and decision-making.
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

        {/* Setup Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Current Setup</h3>
              <p className={`text-sm ${setupStatus.color}`}>{setupStatus.message}</p>
            </div>
            <div className="flex items-center gap-2">
              {setupStatus.status === 'optimal' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {setupStatus.status === 'basic' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              {setupStatus.status === 'not-configured' && <XCircle className="w-5 h-5 text-red-600" />}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Quick Setup</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Configuration</TabsTrigger>
          </TabsList>

          {/* Quick Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">How it works</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      You only need <strong>one API key</strong> to get started. The system will automatically 
                      use the best available provider for each task. Add more providers for better reliability and performance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">AI Provider Strategy</Label>
                <Select
                  value={preferences.preferred_ai_provider}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_ai_provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preferred strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map((provider) => {
                      const IconComponent = provider.icon;
                      return (
                        <SelectItem key={provider.value} value={provider.value}>
                          <div className="flex items-start gap-3 py-1">
                            <IconComponent className="w-5 h-5 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium">{provider.label}</div>
                              <div className="text-sm text-muted-foreground">{provider.description}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {provider.benefits.join(' • ')}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* API Key Input */}
              <div className="space-y-4">
                <Label className="text-base font-medium">API Key (Required)</Label>
                <div className="space-y-3">
                  {/* OpenAI */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        OpenAI API Key
                        {getKeyStatusBadge('openai')}
                      </Label>
                      <div className="flex items-center gap-2">
                        {getValidationIcon('openai')}
                        <Button
                          variant={validationResults.openai?.valid ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleValidateKey('openai')}
                          disabled={!preferences.openai_api_key || validating.openai}
                        >
                          {validating.openai ? 'Testing...' : validationResults.openai?.valid ? 'Valid' : 'Test'}
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type={showKeys.openai ? "text" : "password"}
                        placeholder="sk-... (Get from OpenAI dashboard)"
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
                    {validating.openai && (
                      <p className="text-sm text-blue-600 flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-spin" />
                        Validating...
                      </p>
                    )}
                    {validationResults.openai && !validating.openai && (
                      <p className={`text-sm flex items-center gap-2 ${validationResults.openai.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {validationResults.openai.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {validationResults.openai.message}
                      </p>
                    )}
                  </div>

                  {/* Claude */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Claude API Key (Optional)
                        {getKeyStatusBadge('claude')}
                      </Label>
                      <div className="flex items-center gap-2">
                        {getValidationIcon('claude')}
                        <Button
                          variant={validationResults.claude?.valid ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleValidateKey('claude')}
                          disabled={!preferences.claude_api_key || validating.claude}
                        >
                          {validating.claude ? 'Testing...' : validationResults.claude?.valid ? 'Valid' : 'Test'}
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type={showKeys.claude ? "text" : "password"}
                        placeholder="sk-ant-... (Get from Anthropic dashboard)"
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
                    {validating.claude && (
                      <p className="text-sm text-blue-600 flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-spin" />
                        Validating...
                      </p>
                    )}
                    {validationResults.claude && !validating.claude && (
                      <p className={`text-sm flex items-center gap-2 ${validationResults.claude.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {validationResults.claude.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {validationResults.claude.message}
                      </p>
                    )}
                  </div>

                  {/* Gemini */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Gemini API Key (Optional)
                        {getKeyStatusBadge('gemini')}
                      </Label>
                      <div className="flex items-center gap-2">
                        {getValidationIcon('gemini')}
                        <Button
                          variant={validationResults.gemini?.valid ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleValidateKey('gemini')}
                          disabled={!preferences.gemini_api_key || validating.gemini}
                        >
                          {validating.gemini ? 'Testing...' : validationResults.gemini?.valid ? 'Valid' : 'Test'}
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type={showKeys.gemini ? "text" : "password"}
                        placeholder="AI... (Get from Google AI Studio)"
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
                    {validating.gemini && (
                      <p className="text-sm text-blue-600 flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-spin" />
                        Validating...
                      </p>
                    )}
                    {validationResults.gemini && !validating.gemini && (
                      <p className={`text-sm flex items-center gap-2 ${validationResults.gemini.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {validationResults.gemini.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {validationResults.gemini.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Setup Actions */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={validateBeforeSaving}
                    onCheckedChange={setValidateBeforeSaving}
                  />
                  <Label className="text-sm">Validate keys before saving</Label>
                </div>
                
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Advanced Configuration Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Advanced Configuration</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Fine-tune your AI settings, manage existing keys, and configure advanced options.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Configuration Status */}
              <div className="space-y-3">
                <h4 className="font-medium">Current Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4" />
                      <span className="font-medium text-sm">OpenAI</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {currentSettings.has_openai_key ? 
                        `Configured (${currentSettings.openai_key_preview})` : 
                        'Not configured'
                      }
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4" />
                      <span className="font-medium text-sm">Claude</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {currentSettings.has_claude_key ? 
                        `Configured (${currentSettings.claude_key_preview})` : 
                        'Not configured'
                      }
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium text-sm">Gemini</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {currentSettings.has_gemini_key ? 
                        `Configured (${currentSettings.gemini_key_preview})` : 
                        'Not configured'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Actions */}
              <div className="space-y-3">
                <h4 className="font-medium">Advanced Actions</h4>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={loadCurrentSettings}
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Settings
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleClearAll}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Settings
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 