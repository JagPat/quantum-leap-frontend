import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  TrendingUp, 
  PieChart, 
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Activity,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
  Zap
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePortfolioCoPilot } from '@/hooks/useAI';

export default function PortfolioCoPilotPanel({ portfolioData, onRefresh }) {
  const { toast } = useToast();
  const { analysis, recommendations, analyzePortfolioData, loading, error } = usePortfolioCoPilot();
  
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [tradingDecisions, setTradingDecisions] = useState([]);
  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [marketInsights, setMarketInsights] = useState([]);
  const [autoTradingRecommendations, setAutoTradingRecommendations] = useState([]);

  useEffect(() => {
    if (portfolioData && portfolioData.holdings) {
      handleAnalyze();
    }
  }, [portfolioData]);

  useEffect(() => {
    if (analysis?.analysis) {
      const analysisData = analysis.analysis;
      setTradingDecisions(analysisData.trading_decisions || []);
      setPortfolioHealth(analysisData.portfolio_health || {});
      setMarketInsights(analysisData.market_insights || []);
      setAutoTradingRecommendations(analysisData.auto_trading_recommendations || []);
    }
  }, [analysis]);

  const handleAnalyze = async () => {
    try {
      if (!portfolioData || !portfolioData.holdings) {
        toast({
          title: "No Portfolio Data",
          description: "Please connect your broker account to analyze your portfolio",
          variant: "destructive",
        });
        return;
      }

      const result = await analyzePortfolioData(portfolioData);
      setLastAnalysis(new Date());
      
      // Handle dummy data response
      if (result?.status === 'no_key') {
        toast({
          title: "Sample Analysis",
          description: result.message || "Connect your AI provider to get personalized portfolio analysis",
          variant: "default",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "Portfolio analysis and recommendations updated",
        });
      }

    } catch (err) {
      toast({
        title: "Analysis Failed",
        description: err.message || "Failed to analyze portfolio",
        variant: "destructive",
      });
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthDescription = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm shadow-lg border-0 rounded-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">AI Portfolio Co-Pilot</CardTitle>
                <p className="text-sm text-slate-400">Intelligent portfolio analysis and recommendations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastAnalysis && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Last analyzed</span>
                  <span className="text-sm font-medium text-slate-300">{lastAnalysis.toLocaleTimeString()}</span>
                </div>
              )}
              <Button 
                onClick={handleAnalyze} 
                disabled={loading} 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Analyzing...' : 'Analyze Portfolio'}
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

      {/* AI Trading Decisions - Auto-Trading Focus */}
      {tradingDecisions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Trading Decisions
            </CardTitle>
            <CardDescription>
              Actionable decisions for auto-trading based on AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tradingDecisions.map((decision, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{decision.symbol}</h4>
                        <Badge 
                          className={
                            decision.action === 'BUY' ? 'bg-green-100 text-green-700 border-green-300' :
                            decision.action === 'SELL' ? 'bg-red-100 text-red-700 border-red-300' :
                            'bg-yellow-100 text-yellow-700 border-yellow-300'
                          }
                        >
                          {decision.action}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={
                            decision.urgency === 'HIGH' ? 'border-red-300 text-red-700' :
                            decision.urgency === 'MEDIUM' ? 'border-yellow-300 text-yellow-700' :
                            'border-green-300 text-green-700'
                          }
                        >
                          {decision.urgency} Priority
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{decision.reason}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">Confidence: {(decision.confidence * 100).toFixed(0)}%</span>
                        {decision.price_target && (
                          <span>Target: {formatCurrency(decision.price_target)}</span>
                        )}
                        {decision.stop_loss && (
                          <span>Stop Loss: {formatCurrency(decision.stop_loss)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Trading Recommendations */}
      {autoTradingRecommendations.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Auto-Trading Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered recommendations for automated trading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {autoTradingRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-purple-200">
                  <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Insights */}
      {marketInsights.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Insights
            </CardTitle>
            <CardDescription>
              AI-generated market analysis and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-200">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Health Score */}
      {portfolioHealth && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Portfolio Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getHealthColor(portfolioHealth.overall_score)}`}>
                  {portfolioHealth.overall_score}/100
                </div>
                <div className="text-lg text-gray-600">
                  {getHealthDescription(portfolioHealth.overall_score)}
                </div>
              </div>
              
              <Progress 
                value={portfolioHealth.overall_score} 
                className="w-full"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Risk Level</div>
                  <Badge className={getRiskColor(portfolioHealth.risk_level)}>
                    {portfolioHealth.risk_level}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Diversification</div>
                  <div className={`text-lg font-semibold ${getHealthColor(portfolioHealth.diversification_score * 100)}`}>
                    {(portfolioHealth.diversification_score * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Concentration Risk</div>
                  <div className={`text-lg font-semibold ${getHealthColor(100 - portfolioHealth.concentration_risk * 100)}`}>
                    {(portfolioHealth.concentration_risk * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Analysis */}
      {analysis?.risk_analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.risk_analysis.overall_risk_level && (
                <div className="flex items-center justify-between">
                  <span>Overall Risk Level:</span>
                  <Badge className={getRiskColor(analysis.risk_analysis.overall_risk_level)}>
                    {analysis.risk_analysis.overall_risk_level}
                  </Badge>
                </div>
              )}
              
              {analysis.risk_analysis.concentration_risk && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Concentration Risk:</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(analysis.risk_analysis.concentration_risk)}
                    </span>
                  </div>
                  <Progress value={analysis.risk_analysis.concentration_risk * 100} />
                </div>
              )}
              
              {analysis.risk_analysis.volatility && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Portfolio Volatility:</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(analysis.risk_analysis.volatility)}
                    </span>
                  </div>
                  <Progress value={analysis.risk_analysis.volatility * 100} />
                </div>
              )}
              
              {analysis.risk_analysis.beta && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Market Beta:</span>
                  <span className="text-sm font-medium">
                    {analysis.risk_analysis.beta.toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Diversification Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Diversification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.diversification_analysis?.hhi_index && (
                <div className="flex items-center justify-between">
                  <span>Diversification Score:</span>
                  <Badge variant={analysis.diversification_analysis.hhi_index < 0.15 ? 'default' : 'destructive'}>
                    {analysis.diversification_analysis.hhi_index < 0.15 ? 'Well Diversified' : 'Concentrated'}
                  </Badge>
                </div>
              )}
              
              {analysis.diversification_analysis?.sector_allocation && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sector Allocation:</h4>
                  <div className="space-y-2">
                    {Object.entries(analysis.diversification_analysis.sector_allocation)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([sector, weight]) => (
                      <div key={sector} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{sector}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${weight * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {formatPercentage(weight)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rebalancing Recommendations */}
      {recommendations?.rebalancing_suggestions && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Rebalancing Recommendations
              {recommendations.rebalancing_suggestions.some(rec => rec.is_dummy) && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-100">
                  Sample
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Dummy Data Notice */}
            {recommendations.rebalancing_suggestions.some(rec => rec.is_dummy) && (
              <Alert className="border-blue-200 bg-blue-100 mb-4">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Sample Data:</strong> These are example recommendations to show what you'll get when you connect your AI provider. 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 ml-2"
                    onClick={() => window.location.href = '/ai?tab=settings'}
                  >
                    Configure AI →
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              {recommendations.rebalancing_suggestions.map((suggestion, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{suggestion.symbol}</h4>
                      <p className="text-sm text-gray-600">{suggestion.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {suggestion.action === 'buy' ? (
                          <ArrowUpCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Badge className={suggestion.action === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {suggestion.action.toUpperCase()}
                        </Badge>
                      </div>
                      {suggestion.target_allocation && (
                        <div className="text-sm text-gray-600 mt-1">
                          Target: {formatPercentage(suggestion.target_allocation)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(suggestion.current_price || suggestion.suggested_price) && (
                    <div className="flex justify-between items-center text-sm">
                      {suggestion.current_price && (
                        <span>Current: {formatCurrency(suggestion.current_price)}</span>
                      )}
                      {suggestion.suggested_price && (
                        <span>Target: {formatCurrency(suggestion.suggested_price)}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      {(analysis?.key_insights || recommendations?.insights) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analysis?.key_insights || recommendations?.insights || []).map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {analysis?.performance_metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analysis.performance_metrics).map(([key, value]) => (
                <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 capitalize mb-1">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-semibold">
                    {typeof value === 'number' 
                      ? key.includes('return') || key.includes('change')
                        ? formatPercentage(value)
                        : value.toFixed(2)
                      : value
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Analysis State */}
      {!analysis && !loading && (
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm shadow-lg border-0 rounded-xl">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center border border-blue-500/30">
                <Shield className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Ready for AI Analysis
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                {portfolioData?.holdings 
                  ? 'Connect your AI provider to get intelligent insights, risk analysis, and trading recommendations'
                  : 'Connect your broker account to unlock AI-powered portfolio analysis'
                }
              </p>
              
              {portfolioData?.holdings ? (
                <div className="space-y-4">
                  <Button 
                    onClick={handleAnalyze}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md px-8 py-3"
                  >
                    <Shield className="mr-2 h-5 w-5" />
                    Analyze Portfolio
                  </Button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
                    <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                      <h4 className="font-medium text-white mb-1">Performance Analysis</h4>
                      <p className="text-sm text-slate-400">Risk-adjusted returns and performance metrics</p>
                    </div>
                    <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <PieChart className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                      <h4 className="font-medium text-white mb-1">Diversification</h4>
                      <p className="text-sm text-slate-400">Sector allocation and concentration analysis</p>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Target className="h-6 w-6 text-green-400 mx-auto mb-2" />
                      <h4 className="font-medium text-white mb-1">Trading Signals</h4>
                      <p className="text-sm text-slate-400">AI-powered buy/sell recommendations</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-sm text-slate-400 text-center">
                      <strong>Setup Required:</strong> Add your OpenAI, Claude, or Gemini API key in AI Settings to enable personalized analysis
                    </p>
                    <div className="mt-3 text-center">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                        onClick={() => window.location.href = '/ai?tab=settings'}
                      >
                        Configure AI
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline"
                  className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
                  onClick={() => window.location.href = '/settings'}
                >
                  Connect Broker Account
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 