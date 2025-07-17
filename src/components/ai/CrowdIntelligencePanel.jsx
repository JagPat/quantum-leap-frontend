import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  TrendingUp, 
  Flame,
  Star,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Activity,
  Target,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useCrowdIntelligence } from '@/hooks/useAI';

export default function CrowdIntelligencePanel() {
  const { toast } = useToast();
  const { crowdData, trendingData, refreshInsights, loading, error } = useCrowdIntelligence();
  
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    try {
      await refreshInsights();
      setLastRefresh(new Date());
    } catch (err) {
      toast({
        title: "Failed to Load Insights",
        description: err.message || "Could not fetch crowd intelligence data",
        variant: "destructive",
      });
    }
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number') return '0%';
    return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
  };

  const getPerformanceColor = (performance) => {
    if (performance >= 0.1) return 'text-green-600';
    if (performance >= 0.05) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendingBadge = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'hot':
        return <Badge className="bg-red-100 text-red-700">🔥 Hot</Badge>;
      case 'rising':
        return <Badge className="bg-green-100 text-green-700">📈 Rising</Badge>;
      case 'stable':
        return <Badge className="bg-blue-100 text-blue-700">📊 Stable</Badge>;
      case 'declining':
        return <Badge className="bg-gray-100 text-gray-700">📉 Declining</Badge>;
      default:
        return <Badge variant="outline">{trend}</Badge>;
    }
  };

  const getConfidenceLevel = (score) => {
    if (score >= 0.8) return { label: 'High', color: 'text-green-600' };
    if (score >= 0.6) return { label: 'Medium', color: 'text-yellow-600' };
    return { label: 'Low', color: 'text-red-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Crowd Intelligence
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-sm text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button onClick={handleRefresh} disabled={loading} size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Trending Strategies */}
      {trendingData?.trending_strategies && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                              <Flame className="h-5 w-5" />
              Trending Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendingData.trending_strategies.map((strategy, index) => (
                <div key={strategy.strategy_type || index} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium capitalize">
                        {strategy.strategy_type?.replace('_', ' ') || 'Unknown Strategy'}
                      </h4>
                      {strategy.trend_status && getTrendingBadge(strategy.trend_status)}
                      {strategy.popularity_score && (
                        <Badge variant="outline">
                          <Star className="h-3 w-3 mr-1" />
                          {Math.round(strategy.popularity_score * 100)}% Popular
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {strategy.avg_performance !== undefined && (
                        <div className={`font-medium ${getPerformanceColor(strategy.avg_performance)}`}>
                          {formatPercentage(strategy.avg_performance)}
                        </div>
                      )}
                      {strategy.user_count && (
                        <div className="text-sm text-gray-500">
                          {strategy.user_count} users
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {strategy.popular_symbols && strategy.popular_symbols.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm text-gray-600">Popular Symbols: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {strategy.popular_symbols.slice(0, 5).map(symbol => (
                          <Badge key={symbol} variant="secondary" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                        {strategy.popular_symbols.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{strategy.popular_symbols.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {strategy.total_trades && (
                      <div>
                        <span className="text-gray-600">Total Trades:</span>
                        <div className="font-medium">{strategy.total_trades}</div>
                      </div>
                    )}
                    
                    {strategy.win_rate !== undefined && (
                      <div>
                        <span className="text-gray-600">Win Rate:</span>
                        <div className="font-medium">{formatPercentage(strategy.win_rate)}</div>
                      </div>
                    )}
                    
                    {strategy.risk_score !== undefined && (
                      <div>
                        <span className="text-gray-600">Risk Score:</span>
                        <div className="font-medium">{strategy.risk_score.toFixed(1)}/10</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Community Insights */}
      {crowdData?.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Community Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Market Sentiment */}
              {crowdData.insights.market_sentiment && (
                <div>
                  <h4 className="font-medium mb-3">Community Market Sentiment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(crowdData.insights.market_sentiment).map(([sentiment, percentage]) => (
                      <div key={sentiment} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 capitalize">{sentiment}</div>
                        <div className="text-lg font-semibold">{formatPercentage(percentage)}</div>
                        <Progress value={percentage * 100} className="mt-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Risk Patterns */}
              {crowdData.insights.risk_patterns && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Community Risk Patterns
                  </h4>
                  <div className="space-y-3">
                    {crowdData.insights.risk_patterns.map((pattern, index) => (
                      <Alert key={index} className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <span>{pattern.description || pattern.pattern}</span>
                            {pattern.severity && (
                              <Badge variant={pattern.severity === 'high' ? 'destructive' : 'secondary'}>
                                {pattern.severity}
                              </Badge>
                            )}
                          </div>
                          {pattern.affected_symbols && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pattern.affected_symbols.map(symbol => (
                                <Badge key={symbol} variant="outline" className="text-xs">
                                  {symbol}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Popular Symbols */}
              {crowdData.insights.popular_symbols && (
                <div>
                  <h4 className="font-medium mb-3">Most Traded Symbols</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {crowdData.insights.popular_symbols.map((symbolData, index) => (
                      <div key={symbolData.symbol || index} className="p-3 border rounded-lg text-center">
                        <div className="font-medium">{symbolData.symbol}</div>
                        <div className="text-sm text-gray-600">
                          {symbolData.trade_count} trades
                        </div>
                        {symbolData.avg_performance !== undefined && (
                          <div className={`text-sm font-medium ${getPerformanceColor(symbolData.avg_performance)}`}>
                            {formatPercentage(symbolData.avg_performance)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Summary */}
      {(crowdData?.statistics || trendingData?.statistics) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Community Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Merge statistics from both sources */}
              {Object.entries({
                ...(crowdData?.statistics || {}),
                ...(trendingData?.statistics || {})
              }).map(([key, value]) => (
                <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-semibold">
                    {typeof value === 'number' 
                      ? key.includes('rate') || key.includes('performance')
                        ? formatPercentage(value)
                        : value.toFixed(0)
                      : value
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      {crowdData?.performance_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {crowdData.performance_insights.map((insight, index) => (
                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">{insight.description || insight}</p>
                      {insight.confidence_level && (
                        <div className="mt-1">
                          <Badge 
                            className={getConfidenceLevel(insight.confidence_level).color}
                            variant="outline"
                          >
                            {getConfidenceLevel(insight.confidence_level).label} Confidence
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!crowdData && !trendingData && !loading && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No Crowd Intelligence Available
              </h3>
              <p className="text-gray-500 mb-4">
                Community insights will appear here when enough trading data is available
              </p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Freshness Indicator */}
      {(crowdData || trendingData) && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Data aggregated from community trading activity. 
                {crowdData?.generated_at && (
                  <> Last updated: {new Date(crowdData.generated_at).toLocaleString()}</>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 