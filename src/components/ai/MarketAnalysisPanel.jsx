import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAI } from '@/hooks/useAI';

const ANALYSIS_TYPES = [
  { 
    value: 'market', 
    label: 'Market Overview', 
    description: 'General market sentiment and trends',
    icon: BarChart3 
  },
  { 
    value: 'technical', 
    label: 'Technical Analysis', 
    description: 'Chart patterns and technical indicators',
    icon: Activity 
  },
  { 
    value: 'sentiment', 
    label: 'Sentiment Analysis', 
    description: 'News and social sentiment analysis',
    icon: Brain 
  }
];

const TIMEFRAMES = [
  { value: 'intraday', label: 'Intraday' },
  { value: 'short_term', label: 'Short Term (1-7 days)' },
  { value: 'medium_term', label: 'Medium Term (1-4 weeks)' },
  { value: 'long_term', label: 'Long Term (1-3 months)' }
];

export default function MarketAnalysisPanel() {
  const { toast } = useToast();
  const { 
    generateMarketAnalysis, 
    generateTechnicalAnalysis, 
    generateSentimentAnalysis, 
    loading, 
    error 
  } = useAI();
  
  const [activeTab, setActiveTab] = useState('market');
  const [formData, setFormData] = useState({
    symbols: '',
    timeframe: 'short_term',
    context: ''
  });
  
  const [analyses, setAnalyses] = useState({
    market: null,
    technical: null,
    sentiment: null
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyze = async (analysisType) => {
    try {
      if (!formData.symbols.trim()) {
        toast({
          title: "Missing Information",
          description: "Please enter at least one symbol to analyze",
          variant: "destructive",
        });
        return;
      }

      console.log(`📡 [MarketAnalysisPanel] Generating ${analysisType} analysis...`);
      const symbolList = formData.symbols.split(',').map(s => s.trim().toUpperCase());
      
      const request = {
        symbols: symbolList,
        timeframe: formData.timeframe,
        context: formData.context || `Analyze ${symbolList.join(', ')} for ${formData.timeframe} outlook`
      };

      let result;
      switch (analysisType) {
        case 'market':
          result = await generateMarketAnalysis(request);
          break;
        case 'technical':
          result = await generateTechnicalAnalysis(request);
          break;
        case 'sentiment':
          result = await generateSentimentAnalysis(request);
          break;
        default:
          throw new Error('Invalid analysis type');
      }

      console.log(`📡 [MarketAnalysisPanel] ${analysisType} analysis response:`, result);

      // Handle no_key status (user not connected to AI)
      if (result?.status === 'no_key') {
        console.log(`🔑 [MarketAnalysisPanel] No AI key configured - showing dummy data`);
        setAnalyses(prev => ({ ...prev, [analysisType]: result }));
        toast({
          title: "Sample Analysis",
          description: result.message || "Connect your AI provider to get personalized market analysis",
          variant: "default",
        });
        return;
      }

      // Handle not_implemented status
      if (result?.status === 'not_implemented') {
        console.log(`🚧 [MarketAnalysisPanel] ${analysisType} analysis not yet implemented`);
        toast({
          title: "Feature Coming Soon",
          description: result.message || `${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} is planned but not yet implemented`,
          variant: "default",
        });
        return;
      }

      // Handle unauthorized status
      if (result?.status === 'unauthorized') {
        console.log(`🔐 [MarketAnalysisPanel] Unauthorized for ${analysisType} analysis`);
        toast({
          title: "Authentication Required",
          description: result.message || "Please connect to your broker to access market analysis",
          variant: "destructive",
        });
        return;
      }

      setAnalyses(prev => ({ ...prev, [analysisType]: result }));
      
      const isDummy = result?.analysis?.is_dummy;
      toast({
        title: isDummy ? "Sample Analysis Generated" : "Analysis Complete",
        description: isDummy 
          ? "This is example analysis (connect AI for personalized insights)"
          : `${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} generated successfully!`,
      });

    } catch (err) {
      console.error(`❌ [MarketAnalysisPanel] Failed to generate ${analysisType} analysis:`, err);
      toast({
        title: "Analysis Failed",
        description: err.message || "Failed to generate analysis",
        variant: "destructive",
      });
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'bearish':
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderAnalysisContent = (analysisType) => {
    const analysis = analyses[analysisType];
    const analysisConfig = ANALYSIS_TYPES.find(t => t.value === analysisType);
    const IconComponent = analysisConfig?.icon || Brain;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            <h3 className="text-lg font-medium">{analysisConfig?.label}</h3>
          </div>
          <Button 
            onClick={() => handleAnalyze(analysisType)} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </div>

        {analysis ? (
          <div className="space-y-4">
            {/* Dummy Data Notice */}
            {analysis.analysis?.is_dummy && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Sample Data:</strong> This is example analysis to show what you'll get when you connect your AI provider. 
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
            
            {/* Key Metrics */}
            {analysis.key_metrics && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(analysis.key_metrics).map(([key, value]) => (
                      <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-lg font-semibold">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Sentiment/Direction */}
            {(analysis.overall_sentiment || analysis.market_direction) && (
              <div className="flex flex-wrap gap-2">
                {analysis.overall_sentiment && (
                  <Badge className={getSentimentColor(analysis.overall_sentiment)}>
                    Sentiment: {analysis.overall_sentiment}
                  </Badge>
                )}
                {analysis.market_direction && (
                  <Badge className={getSentimentColor(analysis.market_direction)}>
                    Direction: {analysis.market_direction}
                  </Badge>
                )}
                {analysis.confidence_score && (
                  <Badge className={getConfidenceColor(analysis.confidence_score)}>
                    Confidence: {Math.round(analysis.confidence_score * 100)}%
                  </Badge>
                )}
              </div>
            )}

            {/* Main Analysis Content */}
            <Card>
              <CardContent className="pt-6">
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {analysis.analysis_content || analysis.insights || analysis.summary}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Symbol-specific insights */}
            {analysis.symbol_insights && (
              <div className="space-y-3">
                <h4 className="font-medium">Symbol Analysis</h4>
                {Object.entries(analysis.symbol_insights).map(([symbol, insight]) => (
                  <Card key={symbol} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{symbol}</h5>
                        {insight.recommendation && (
                          <Badge 
                            className={getSentimentColor(insight.recommendation)}
                          >
                            {insight.recommendation}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        {insight.analysis || insight.summary}
                      </p>
                      {insight.target_price && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">Target Price: </span>
                          <span className="font-medium">₹{insight.target_price}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Risk Factors */}
            {analysis.risk_factors && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.risk_factors.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              Generated at {new Date(analysis.generated_at || Date.now()).toLocaleString()}
            </div>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <IconComponent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No {analysisConfig?.label} Yet
                </h3>
                <p className="text-gray-500 mb-4">
                  {analysisConfig?.description}
                </p>
                <Button onClick={() => handleAnalyze(analysisType)} disabled={loading}>
                  Generate Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symbols">Symbols to Analyze</Label>
              <Input
                id="symbols"
                placeholder="RELIANCE, TCS, INFY"
                value={formData.symbols}
                onChange={(e) => handleInputChange('symbols', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="timeframe">Analysis Timeframe</Label>
              <Select 
                value={formData.timeframe} 
                onValueChange={(value) => handleInputChange('timeframe', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="context">Additional Context (optional)</Label>
            <Input
              id="context"
              placeholder="Specific events, news, or focus areas..."
              value={formData.context}
              onChange={(e) => handleInputChange('context', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {ANALYSIS_TYPES.map(type => {
            const IconComponent = type.icon;
            return (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                {type.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {ANALYSIS_TYPES.map(type => (
          <TabsContent key={type.value} value={type.value}>
            {renderAnalysisContent(type.value)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 