import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Target, 
  TrendingUp,
  TrendingDown,
  Award,
  Activity,
  RefreshCw,
  Filter,
  Star,
  Clock,
  DollarSign
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAI } from '@/hooks/useAI';

const PERFORMANCE_TIERS = [
  { value: 'high', label: 'Top Performers', color: 'text-green-600 bg-green-100 border-green-300', icon: Award },
  { value: 'medium', label: 'Average Performers', color: 'text-yellow-600 bg-yellow-100 border-yellow-300', icon: Activity },
  { value: 'low', label: 'Underperformers', color: 'text-red-600 bg-red-100 border-red-300', icon: TrendingDown }
];

const STRATEGY_TYPES = [
  { value: 'momentum', label: 'Momentum', color: 'bg-blue-100 text-blue-700' },
  { value: 'mean_reversion', label: 'Mean Reversion', color: 'bg-purple-100 text-purple-700' },
  { value: 'breakout', label: 'Breakout', color: 'bg-orange-100 text-orange-700' },
  { value: 'scalping', label: 'Scalping', color: 'bg-green-100 text-green-700' },
  { value: 'swing', label: 'Swing', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-100 text-gray-700' }
];

export default function StrategyInsightsPanel() {
  const { toast } = useToast();
  const { getStrategyClustering, getStrategyAnalytics, loading, error } = useAI();
  
  const [clustering, setClustering] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [strategyAnalytics, setStrategyAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('clustering');

  useEffect(() => {
    fetchClustering();
  }, []);

  const fetchClustering = async () => {
    try {
      const data = await getStrategyClustering();
      setClustering(data);
    } catch (err) {
      toast({
        title: "Failed to Load Strategy Insights",
        description: err.message || "Could not fetch strategy clustering data",
        variant: "destructive",
      });
    }
  };

  const fetchStrategyAnalytics = async (strategyId) => {
    try {
      const data = await getStrategyAnalytics(strategyId);
      setStrategyAnalytics(data);
      setSelectedStrategy(strategyId);
      setActiveTab('analytics');
    } catch (err) {
      toast({
        title: "Failed to Load Strategy Analytics",
        description: err.message || "Could not fetch strategy analytics",
        variant: "destructive",
      });
    }
  };

  const getStrategyTypeColor = (type) => {
    const strategyType = STRATEGY_TYPES.find(st => st.value === type);
    return strategyType?.color || 'bg-gray-100 text-gray-700';
  };

  const getTierConfig = (tier) => {
    return PERFORMANCE_TIERS.find(t => t.value === tier) || PERFORMANCE_TIERS[1];
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number') return '0%';
    return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderClusteringTab = () => (
    <div className="space-y-6">
      {clustering?.clusters ? (
        <div className="space-y-6">
          {Object.entries(clustering.clusters).map(([tier, clusterData]) => {
            const tierConfig = getTierConfig(tier);
            const IconComponent = tierConfig.icon;
            
            return (
              <Card key={tier} className={`border-2 ${tierConfig.color.includes('green') ? 'border-green-200' : tierConfig.color.includes('yellow') ? 'border-yellow-200' : 'border-red-200'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {tierConfig.label}
                    <Badge variant="outline">{clusterData.strategies?.length || 0} strategies</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clusterData.strategies && clusterData.strategies.length > 0 ? (
                    <div className="space-y-4">
                      {/* Tier Summary */}
                      {clusterData.summary && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-700">{clusterData.summary}</p>
                        </div>
                      )}
                      
                      {/* Performance Metrics */}
                      {clusterData.performance_metrics && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(clusterData.performance_metrics).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="text-sm text-gray-600 capitalize">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-lg font-semibold">
                                {key.includes('return') || key.includes('rate') 
                                  ? formatPercentage(value)
                                  : typeof value === 'number' ? value.toFixed(2) : value
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Strategy List */}
                      <div className="space-y-3">
                        {clusterData.strategies.map((strategy, index) => (
                          <div 
                            key={strategy.strategy_id || index} 
                            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => strategy.strategy_id && fetchStrategyAnalytics(strategy.strategy_id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {strategy.strategy_id || `Strategy ${index + 1}`}
                                </h4>
                                {strategy.strategy_type && (
                                  <Badge className={getStrategyTypeColor(strategy.strategy_type)}>
                                    {strategy.strategy_type.replace('_', ' ')}
                                  </Badge>
                                )}
                                {strategy.is_representative && (
                                  <Badge className="bg-yellow-100 text-yellow-700">
                                    <Star className="h-3 w-3 mr-1" />
                                    Representative
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {strategy.confidence_score && (
                                  <Badge className={getConfidenceColor(strategy.confidence_score)}>
                                    {Math.round(strategy.confidence_score * 100)}%
                                  </Badge>
                                )}
                                {strategy.performance_score && (
                                  <Badge variant="outline">
                                    Score: {strategy.performance_score.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {strategy.tags && strategy.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {strategy.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              {strategy.total_return && (
                                <div>
                                  <span className="text-gray-600">Return:</span>
                                  <span className={`ml-1 font-medium ${strategy.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercentage(strategy.total_return)}
                                  </span>
                                </div>
                              )}
                              
                              {strategy.win_rate && (
                                <div>
                                  <span className="text-gray-600">Win Rate:</span>
                                  <span className="ml-1 font-medium">
                                    {formatPercentage(strategy.win_rate)}
                                  </span>
                                </div>
                              )}
                              
                              {strategy.total_trades && (
                                <div>
                                  <span className="text-gray-600">Trades:</span>
                                  <span className="ml-1 font-medium">{strategy.total_trades}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No strategies in this tier yet
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No Strategy Clusters Available
              </h3>
              <p className="text-gray-500 mb-4">
                Generate some trading strategies to see performance clustering and insights
              </p>
              <Button onClick={fetchClustering} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Insights
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {strategyAnalytics ? (
        <div className="space-y-6">
          {/* Strategy Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Strategy Analytics: {selectedStrategy}
                </CardTitle>
                <Button 
                  onClick={() => fetchStrategyAnalytics(selectedStrategy)} 
                  disabled={loading}
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {strategyAnalytics.strategy_type && (
                  <Badge className={getStrategyTypeColor(strategyAnalytics.strategy_type)}>
                    {strategyAnalytics.strategy_type.replace('_', ' ')}
                  </Badge>
                )}
                {strategyAnalytics.confidence_score && (
                  <Badge className={getConfidenceColor(strategyAnalytics.confidence_score)}>
                    {Math.round(strategyAnalytics.confidence_score * 100)}% Confidence
                  </Badge>
                )}
                {strategyAnalytics.risk_level && (
                  <Badge variant="outline">{strategyAnalytics.risk_level} Risk</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          {strategyAnalytics.performance_metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(strategyAnalytics.performance_metrics).map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-lg font-semibold">
                        {key.includes('return') || key.includes('rate')
                          ? formatPercentage(value)
                          : typeof value === 'number' ? value.toFixed(2) : value
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trade History */}
          {strategyAnalytics.trade_history && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategyAnalytics.trade_history.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${trade.outcome === 'win' ? 'bg-green-500' : trade.outcome === 'loss' ? 'bg-red-500' : 'bg-gray-500'}`} />
                        <div>
                          <div className="font-medium">
                            {trade.outcome?.charAt(0).toUpperCase() + trade.outcome?.slice(1)}
                          </div>
                          {trade.recorded_at && (
                            <div className="text-sm text-gray-500">
                              {new Date(trade.recorded_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {trade.actual_return && (
                          <div className={`font-medium ${trade.actual_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(trade.actual_return)}
                          </div>
                        )}
                        {trade.duration_hours && (
                          <div className="text-sm text-gray-500">
                            {Math.round(trade.duration_hours / 24)}d
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Learning Insights */}
          {strategyAnalytics.learning_insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Learning Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategyAnalytics.learning_insights.map((insight, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No Strategy Selected
              </h3>
              <p className="text-gray-500 mb-4">
                Click on a strategy from the clustering view to see detailed analytics
              </p>
              <Button onClick={() => setActiveTab('clustering')}>
                View Strategy Clusters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Strategy Insights & Analytics
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clustering" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Strategy Clustering
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Detailed Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="clustering">
          {renderClusteringTab()}
        </TabsContent>
        
        <TabsContent value="analytics">
          {renderAnalyticsTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
} 