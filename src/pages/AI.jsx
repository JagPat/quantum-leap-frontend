import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Target,
  MessageSquare,
  BarChart3,
  Users,
  Shield,
  Activity,
  Settings,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAI } from '@/hooks/useAI';

// Lazy load all AI components for optimal performance
const StrategyGenerationPanel = React.lazy(() => import('@/components/ai/StrategyGenerationPanel'));
const MarketAnalysisPanel = React.lazy(() => import('@/components/ai/MarketAnalysisPanel'));
const TradingSignalsPanel = React.lazy(() => import('@/components/ai/TradingSignalsPanel'));
const PortfolioCoPilotPanel = React.lazy(() => import('@/components/ai/PortfolioCoPilotPanel'));
const FeedbackPanel = React.lazy(() => import('@/components/ai/FeedbackPanel'));
const StrategyInsightsPanel = React.lazy(() => import('@/components/ai/StrategyInsightsPanel'));
const CrowdIntelligencePanel = React.lazy(() => import('@/components/ai/CrowdIntelligencePanel'));
const OpenAIAssistantChat = React.lazy(() => import('@/components/ai/OpenAIAssistantChat'));

// Individual loading components for each AI panel
const AITabLoading = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div className="flex items-center space-x-2">
      <Brain className="h-6 w-6 animate-pulse text-amber-500" />
      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
    </div>
    <div className="text-center">
      <p className="text-slate-300 text-lg font-medium">Loading {title}...</p>
      <p className="text-slate-500 text-sm mt-1">{description}</p>
    </div>
  </div>
);

// Specialized loading states for different AI features
const loadingComponents = {
  strategy: <AITabLoading title="Strategy Generation" description="Preparing AI strategy builder..." />,
  analysis: <AITabLoading title="Market Analysis" description="Loading market intelligence..." />,
  signals: <AITabLoading title="Trading Signals" description="Fetching real-time signals..." />,
  copilot: <AITabLoading title="Portfolio Co-Pilot" description="Analyzing portfolio health..." />,
  feedback: <AITabLoading title="Feedback System" description="Loading learning interface..." />,
  insights: <AITabLoading title="Strategy Insights" description="Processing strategy analytics..." />,
  crowd: <AITabLoading title="Crowd Intelligence" description="Gathering community insights..." />,
  assistant: <AITabLoading title="OpenAI Assistant" description="Initializing AI assistant..." />
};

// AI Settings should be lightweight, so keep as regular import
import AISettingsForm from '@/components/settings/AISettingsForm';

const AI_TABS = [
  {
    value: 'assistant',
    label: 'AI Assistant',
    icon: Brain,
    description: 'Chat with OpenAI Assistant for trading insights',
    component: OpenAIAssistantChat
  },
  {
    value: 'strategy',
    label: 'Strategy Generator',
    icon: Zap,
    description: 'Generate AI-powered trading strategies',
    component: StrategyGenerationPanel
  },
  {
    value: 'analysis',
    label: 'Market Analysis',
    icon: TrendingUp,
    description: 'AI market and technical analysis',
    component: MarketAnalysisPanel
  },
  {
    value: 'signals',
    label: 'Trading Signals',
    icon: Target,
    description: 'AI-generated buy/sell signals',
    component: TradingSignalsPanel
  },
  {
    value: 'copilot',
    label: 'Portfolio Co-Pilot',
    icon: Shield,
    description: 'AI portfolio analysis and recommendations',
    component: PortfolioCoPilotPanel
  },
  {
    value: 'feedback',
    label: 'Trade Feedback',
    icon: MessageSquare,
    description: 'Submit outcomes and view AI learning',
    component: FeedbackPanel
  },
  {
    value: 'insights',
    label: 'Strategy Insights',
    icon: BarChart3,
    description: 'Strategy clustering and analytics',
    component: StrategyInsightsPanel
  },
  {
    value: 'crowd',
    label: 'Crowd Intelligence',
    icon: Users,
    description: 'Community trends and insights',
    component: CrowdIntelligencePanel
  },
  {
    value: 'settings',
    label: 'AI Settings',
    icon: Settings,
    description: 'Configure AI providers and preferences',
    component: AISettingsForm
  }
];

export default function AIPage() {
  const { toast } = useToast();
  const { getAIStatus, getAIHealth } = useAI();
  
  const [activeTab, setActiveTab] = useState('assistant');
  const [aiStatus, setAiStatus] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProviderStatus, setUserProviderStatus] = useState(null);

  useEffect(() => {
    checkAIStatus();
    // Only load portfolio data when copilot tab is accessed to improve initial load time
    if (activeTab === 'copilot') {
      loadPortfolioData();
    }
  }, []);

  // Load portfolio data when switching to copilot tab
  useEffect(() => {
    if (activeTab === 'copilot' && !portfolioData) {
      loadPortfolioData();
    }
  }, [activeTab]);

  const checkAIStatus = async () => {
    try {
      // Check if user is authenticated first
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected && config.access_token);
      
      if (!activeConfig) {
        console.warn('No authenticated broker found for AI status check');
        setAiStatus({ 
          status: 'unauthenticated', 
          message: 'Please connect to your broker to access AI features' 
        });
        setLoading(false);
        return;
      }
      
      const [status, health] = await Promise.all([
        getAIStatus(),
        getAIHealth()
      ]);
      setAiStatus({ ...status, ...health });
      
      // Check user's AI provider status for BYOAI
      try {
        if (activeConfig?.user_data?.user_id) {
          const userPrefs = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/ai/preferences`, {
            headers: {
              'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,
              'X-User-ID': activeConfig.user_data.user_id
            }
          });
          if (userPrefs.ok) {
            const prefs = await userPrefs.json();
            setUserProviderStatus(prefs.data?.preferences);
          }
        }
      } catch (err) {
        console.log('User AI preferences not available:', err);
      }
    } catch (err) {
      console.error('Failed to check AI status:', err);
      setAiStatus({ 
        status: 'error', 
        message: 'Failed to check AI status. Please ensure you are connected to your broker.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioData = () => {
    try {
      // Try to get portfolio data from localStorage or context
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected);
      
      if (activeConfig && activeConfig.portfolio_data) {
        setPortfolioData(activeConfig.portfolio_data);
      }
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'operational':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'degraded':
      case 'partial':
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'down':
      case 'error':
        return 'text-red-600 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const renderTabContent = () => {
    const currentTab = AI_TABS.find(tab => tab.value === activeTab);
    if (!currentTab) return null;

    const ComponentToRender = currentTab.component;
    
    // Pass additional props for specific components
    const componentProps = {};
    if (activeTab === 'copilot') {
      componentProps.portfolioData = portfolioData;
      componentProps.onRefresh = loadPortfolioData;
    }

    // Wrap heavy AI components in Suspense for better loading experience
    if (activeTab === 'settings') {
      // AI Settings is lightweight, render immediately
      return <ComponentToRender {...componentProps} />;
    }

    return (
      <Suspense fallback={loadingComponents[activeTab] || <AITabLoading />}>
        <ComponentToRender {...componentProps} />
      </Suspense>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Initializing AI Engine...
            </h3>
            <p className="text-gray-500">
              Checking AI providers and system status
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Authentication Alert */}
      {aiStatus?.status === 'unauthenticated' && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <strong>Authentication Required:</strong> {aiStatus.message}
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.href = '/settings'}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Go to Settings
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* AI Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                AI Trading Engine
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Comprehensive AI-powered trading analysis and strategy generation
              </p>
            </div>
            
            {/* AI Status Indicators */}
            <div className="flex items-center gap-3">
              {aiStatus?.overall_status && (
                <Badge className={getStatusColor(aiStatus.overall_status)}>
                  <Activity className="h-3 w-3 mr-1" />
                  {aiStatus.overall_status}
                </Badge>
              )}
              
              {/* BYOAI Status Indicator */}
              {userProviderStatus && (
                <Badge className="text-blue-600 bg-blue-100 border-blue-300">
                  <Shield className="h-3 w-3 mr-1" />
                  BYOAI: {userProviderStatus.preferred_ai_provider || 'Auto'}
                </Badge>
              )}
              
              {aiStatus?.provider_status && (
                <div className="flex gap-1">
                  {Object.entries(aiStatus.provider_status).map(([provider, status]) => (
                    <Badge 
                      key={provider} 
                      className={getStatusColor(status)}
                      variant="outline"
                    >
                      {provider}: {status}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* System Alerts */}
        {aiStatus?.alerts && aiStatus.alerts.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              {aiStatus.alerts.map((alert, index) => (
                <Alert key={index} variant={alert.severity === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quick Stats */}
      {aiStatus?.statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(aiStatus.statistics).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main AI Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          {AI_TABS.map(tab => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex flex-col items-center gap-1 h-16 p-2"
              >
                <IconComponent className="h-4 w-4" />
                <span className="text-xs text-center leading-tight">
                  {tab.label.split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        <div>
          {AI_TABS.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              <div className="space-y-4">
                {/* Tab Description */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <tab.icon className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-blue-900">{tab.label}</h3>
                        <p className="text-sm text-blue-700">{tab.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Component Content */}
                {renderTabContent()}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Help & Documentation */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h4 className="font-medium text-gray-600 mb-1">Need Help?</h4>
            <p className="text-sm text-gray-500">
              Visit the AI Settings tab to configure your providers, or check our documentation for detailed guides.
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                AI Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={checkAIStatus}
              >
                <Activity className="mr-2 h-4 w-4" />
                Check Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 