import React, { useState, useEffect, Suspense, Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Loader2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6 animate-pulse text-blue-400" />
        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
      </div>
    </div>
    <div className="text-center">
      <h3 className="text-lg font-bold text-white mb-1">Loading {title}...</h3>
      <p className="text-slate-400 text-sm">{description}</p>
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

// Simple Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/30 inline-block mb-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-base font-medium text-white mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            An error occurred while loading this component.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-sm"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  
  const [activeTab, setActiveTab] = useState('assistant');
  const [aiStatus, setAiStatus] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProviderStatus, setUserProviderStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    setError(null);
    try {
      console.log('🔍 [AIPage] Checking AI status...');
      
      // Check if user is authenticated first
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected && config.access_token);
      
      if (!activeConfig) {
        console.warn('🔍 [AIPage] No authenticated broker found for AI status check');
        setAiStatus({ 
          status: 'unauthenticated', 
          overall_status: 'offline',
          message: 'Please connect to your broker to access AI features' 
        });
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      console.log('🔍 [AIPage] Found active config for user:', activeConfig.user_data?.user_id);
      
      // Use railwayAPI for consistent authentication handling
      const { railwayAPI } = await import('@/api/railwayAPI');
      
      // Get AI status and health with proper authentication
      const [statusResponse, healthResponse] = await Promise.all([
        railwayAPI.request('/api/ai/status', {
          method: 'GET',
          headers: {
            'X-User-ID': activeConfig.user_data.user_id,
            'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
          }
        }).catch(err => {
          console.warn('🔍 [AIPage] Status check failed:', err);
          return { status: 'error', message: 'Status check failed' };
        }),
        
        railwayAPI.request('/api/ai/health', {
          method: 'GET',
          headers: {
            'X-User-ID': activeConfig.user_data.user_id,
            'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
          }
        }).catch(err => {
          console.warn('🔍 [AIPage] Health check failed:', err);
          return { status: 'error', message: 'Health check failed' };
        })
      ]);
      
      console.log('🔍 [AIPage] Status response:', statusResponse);
      console.log('🔍 [AIPage] Health response:', healthResponse);
      
      // Combine status and health data
      const combinedStatus = {
        ...statusResponse,
        ...healthResponse,
        overall_status: healthResponse.status === 'healthy' ? 'online' : 'offline',
        lastChecked: new Date().toISOString()
      };
      
      setAiStatus(combinedStatus);
      
      // Check user's AI provider status for BYOAI
      try {
        if (activeConfig?.user_data?.user_id) {
          const userPrefs = await railwayAPI.request('/api/ai/preferences', {
            method: 'GET',
            headers: {
              'X-User-ID': activeConfig.user_data.user_id,
              'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`
            }
          });
          
          console.log('🔍 [AIPage] User preferences response:', userPrefs);
          
          if (userPrefs.status === 'success' && userPrefs.preferences) {
            setUserProviderStatus(userPrefs.preferences);
          } else if (userPrefs.status === 'no_key') {
            setUserProviderStatus({
              preferred_ai_provider: 'auto',
              has_openai_key: false,
              has_claude_key: false,
              has_gemini_key: false
            });
          }
        }
      } catch (err) {
        console.log('🔍 [AIPage] User AI preferences not available:', err);
        // Don't set error for preferences - it's optional
      }
    } catch (err) {
      console.error('❌ [AIPage] Failed to check AI status:', err);
      setError('Failed to check AI status. Please ensure you are connected to your broker.');
      setAiStatus({ 
        status: 'error', 
        overall_status: 'offline',
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
      case 'online':
      case 'available':
        return 'text-green-300 bg-green-500/20 border-green-400/30';
      case 'degraded':
      case 'partial':
      case 'warning':
        return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case 'down':
      case 'error':
      case 'offline':
      case 'unavailable':
        return 'text-red-300 bg-red-500/20 border-red-400/30';
      default:
        return 'text-slate-300 bg-slate-500/20 border-slate-400/30';
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
      <Suspense 
        fallback={loadingComponents[activeTab] || <AITabLoading />}
        onError={(error) => {
          console.error('Error loading AI component:', error);
          setError(`Failed to load ${currentTab.label}. Please try refreshing the page.`);
        }}
      >
        <ErrorBoundary
          fallback={
            <div className="p-6 text-center">
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-400/30 inline-block mb-4">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">
                Component Error
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Failed to load {currentTab.label}. Please try refreshing the page.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              >
                Refresh Page
              </Button>
            </div>
          }
        >
          <ComponentToRender {...componentProps} />
        </ErrorBoundary>
      </Suspense>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-400 animate-pulse" />
              <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Loading AI Engine...</h2>
            <p className="text-slate-400 text-sm">Initializing AI features</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">AI Engine</h1>
              <p className="text-slate-400 text-sm">Intelligent trading analysis and decision support</p>
            </div>
            
            {/* AI Status Badge */}
            {aiStatus && (
              <div className="flex items-center gap-2">
                <Badge className={`px-2 py-1 text-xs ${getStatusColor(aiStatus.overall_status)}`}>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      aiStatus.overall_status === 'online' ? 'bg-green-400' : 
                      aiStatus.overall_status === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                    }`} />
                    <span className="text-xs font-medium">
                      {aiStatus.overall_status === 'online' ? 'Online' : 
                       aiStatus.overall_status === 'offline' ? 'Offline' : 'Degraded'}
                    </span>
                  </div>
                </Badge>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={checkAIStatus}
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 p-1 h-8 w-8"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Authentication Alert */}
          {!isAuthenticated && (
            <Alert className="mb-4 border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200 text-sm">
                <strong>Authentication Required:</strong> Connect to your broker account to access AI features. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-yellow-300 hover:text-yellow-200 ml-2 text-sm"
                  onClick={() => window.location.href = '/broker'}
                >
                  Connect Broker →
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="mb-4 border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 text-sm">
                {error}
                <div className="mt-2 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkAIStatus}
                    className="border-red-400/50 text-red-300 hover:bg-red-500/20 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('settings')}
                    className="border-red-400/50 text-red-300 hover:bg-red-500/20 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Simple Dummy Data Notice */}
          {aiStatus?.status === 'no_key' && aiStatus?.dummy_data && (
            <Alert className="mb-4 border-blue-500/30 bg-blue-500/10">
              <AlertTriangle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200 text-sm">
                <strong>Sample Data:</strong> {aiStatus.dummy_data.setup_instructions}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-300 hover:text-blue-200 ml-2 text-sm"
                  onClick={() => setActiveTab('settings')}
                >
                  Configure AI →
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* AI Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 md:grid-cols-9 bg-slate-800/50 border-slate-700/50 h-auto p-1">
            {AI_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col items-center gap-1 data-[state=active]:bg-blue-600/20 data-[state=active]:border-blue-500/30 p-2 text-xs"
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-xs">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {renderTabContent()}
          </div>
        </Tabs>
        
        {/* Empty State for Unauthenticated Users */}
        {!isAuthenticated && (
          <Card className="border-dashed border-slate-600/50 bg-slate-800/30">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 inline-block">
                  <Brain className="h-12 w-12 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Connect to Access AI Features</h3>
                  <p className="text-slate-400 mb-4 text-sm">
                    Connect your broker account and configure AI provider to use intelligent trading features.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button 
                      onClick={() => window.location.href = '/broker'}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 text-sm"
                    >
                      Connect Broker
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('settings')}
                      className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-sm"
                    >
                      AI Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 