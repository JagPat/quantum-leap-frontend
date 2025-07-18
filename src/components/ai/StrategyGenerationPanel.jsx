import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Target, 
  Clock,
  DollarSign,
  Shield,
  RefreshCw,
  Bookmark,
  Trash2,
  Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useStrategyGeneration } from '@/hooks/useAI';

const STRATEGY_TYPES = [
  { value: 'momentum', label: 'Momentum', description: 'Follow trending assets' },
  { value: 'mean_reversion', label: 'Mean Reversion', description: 'Buy low, sell high' },
  { value: 'breakout', label: 'Breakout', description: 'Trade significant price movements' },
  { value: 'scalping', label: 'Scalping', description: 'Quick small profits' },
  { value: 'swing', label: 'Swing Trading', description: 'Hold for days/weeks' },
  { value: 'custom', label: 'Custom', description: 'AI-generated based on your prompt' }
];

const TIMEFRAMES = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' }
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: 'green' },
  { value: 'medium', label: 'Medium Risk', color: 'yellow' },
  { value: 'high', label: 'High Risk', color: 'red' }
];

export default function StrategyGenerationPanel() {
  const { toast } = useToast();
  const { strategies, generateStrategy, refreshStrategies, loading, error } = useStrategyGeneration();
  
  const [formData, setFormData] = useState({
    strategy_type: 'momentum',
    symbols: '',
    timeframe: '1h',
    risk_level: 'medium',
    context: '',
    custom_prompt: ''
  });

  const [savedStrategies, setSavedStrategies] = useState([]);
  const [generatedStrategy, setGeneratedStrategy] = useState(null);
  const [userProvider, setUserProvider] = useState(null);

  useEffect(() => {
    refreshStrategies();
    checkUserProvider();
  }, [refreshStrategies]);

  const checkUserProvider = async () => {
    try {
      const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeConfig = configs.find(config => config.is_connected);
      if (activeConfig?.user_data?.user_id) {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://web-production-de0bc.up.railway.app'}/api/ai/preferences`, {
          headers: {
            'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,
            'X-User-ID': activeConfig.user_data.user_id
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUserProvider(data.data?.preferences?.preferred_ai_provider || 'auto');
        }
      }
    } catch (err) {
      console.log('Could not fetch user provider:', err);
    }
  };

  useEffect(() => {
    if (strategies) {
      setSavedStrategies(strategies);
    }
  }, [strategies]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateStrategy = async () => {
    try {
      if (!formData.symbols.trim()) {
        toast({
          title: "Missing Information",
          description: "Please enter at least one symbol (e.g., RELIANCE, TCS)",
          variant: "destructive",
        });
        return;
      }

      const symbolList = formData.symbols.split(',').map(s => s.trim().toUpperCase());
      
      const request = {
        strategy_type: formData.strategy_type,
        symbols: symbolList,
        timeframe: formData.timeframe,
        risk_level: formData.risk_level,
        context: formData.context || `Generate a ${formData.strategy_type} strategy`,
        custom_requirements: formData.custom_prompt
      };

      const result = await generateStrategy(request);
      setGeneratedStrategy(result);
      
      toast({
        title: "Strategy Generated",
        description: `New ${formData.strategy_type} strategy created successfully!`,
      });

    } catch (err) {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate strategy",
        variant: "destructive",
      });
    }
  };

  const handleSaveStrategy = () => {
    if (generatedStrategy) {
      const newStrategy = {
        ...generatedStrategy,
        saved_at: new Date().toISOString(),
        id: Date.now().toString()
      };
      setSavedStrategies(prev => [newStrategy, ...prev]);
      setGeneratedStrategy(null);
      
      toast({
        title: "Strategy Saved",
        description: "Strategy added to your collection",
      });
    }
  };

  const handleDiscardStrategy = () => {
    setGeneratedStrategy(null);
    toast({
      title: "Strategy Discarded",
      description: "Generated strategy has been discarded",
    });
  };

  const getRiskColor = (riskLevel) => {
    const colors = { low: 'text-green-600', medium: 'text-yellow-600', high: 'text-red-600' };
    return colors[riskLevel] || 'text-gray-600';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Strategy Generator
            </CardTitle>
            {userProvider && (
              <Badge className="text-blue-600 bg-blue-100 border-blue-300">
                <Shield className="h-3 w-3 mr-1" />
                Using: {userProvider === 'auto' ? 'Auto Selection' : userProvider.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="strategy_type">Strategy Type</Label>
              <Select 
                value={formData.strategy_type} 
                onValueChange={(value) => handleInputChange('strategy_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy type" />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="symbols">Symbols (comma-separated)</Label>
              <Input
                id="symbols"
                placeholder="RELIANCE, TCS, INFY"
                value={formData.symbols}
                onChange={(e) => handleInputChange('symbols', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
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
            
            <div>
              <Label htmlFor="risk_level">Risk Level</Label>
              <Select 
                value={formData.risk_level} 
                onValueChange={(value) => handleInputChange('risk_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map(risk => (
                    <SelectItem key={risk.value} value={risk.value}>
                      <span className={getRiskColor(risk.value)}>{risk.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="context">Market Context (optional)</Label>
            <Textarea
              id="context"
              placeholder="Current market conditions, news, or specific focus areas..."
              value={formData.context}
              onChange={(e) => handleInputChange('context', e.target.value)}
              rows={2}
            />
          </div>
          
          {formData.strategy_type === 'custom' && (
            <div>
              <Label htmlFor="custom_prompt">Custom Strategy Requirements</Label>
              <Textarea
                id="custom_prompt"
                placeholder="Describe your specific strategy requirements..."
                value={formData.custom_prompt}
                onChange={(e) => handleInputChange('custom_prompt', e.target.value)}
                rows={3}
              />
            </div>
          )}
          
          <Button 
            onClick={handleGenerateStrategy} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating Strategy...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate AI Strategy
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Generated Strategy Display */}
      {generatedStrategy && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Generated Strategy
              </span>
              <div className="flex gap-2">
                <Button onClick={handleSaveStrategy} size="sm">
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button onClick={handleDiscardStrategy} variant="outline" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Discard
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{generatedStrategy.strategy_type}</Badge>
                <Badge className={getRiskColor(generatedStrategy.risk_level)}>
                  {generatedStrategy.risk_level} Risk
                </Badge>
                <Badge className={getConfidenceColor(generatedStrategy.confidence_score)}>
                  {Math.round(generatedStrategy.confidence_score * 100)}% Confidence
                </Badge>
                <Badge variant="outline">{generatedStrategy.timeframe}</Badge>
                {generatedStrategy.provider_used && (
                  <Badge className="text-blue-600 bg-blue-100 border-blue-300">
                    <Shield className="h-3 w-3 mr-1" />
                    {generatedStrategy.provider_used.toUpperCase()}
                  </Badge>
                )}
              </div>
              
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium mb-2">Strategy Details:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{generatedStrategy.strategy_content}</p>
              </div>
              
              {generatedStrategy.expected_return && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Expected Return: {generatedStrategy.expected_return}%</span>
                  </div>
                  {generatedStrategy.max_drawdown && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Max Drawdown: {generatedStrategy.max_drawdown}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Strategies */}
      {savedStrategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              My Strategies ({savedStrategies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedStrategies.map((strategy, index) => (
                <div key={strategy.id || index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{strategy.strategy_type}</Badge>
                      <Badge className={getRiskColor(strategy.risk_level)}>
                        {strategy.risk_level} Risk
                      </Badge>
                      {strategy.confidence_score && (
                        <Badge className={getConfidenceColor(strategy.confidence_score)}>
                          {Math.round(strategy.confidence_score * 100)}% Confidence
                        </Badge>
                      )}
                    </div>
                    {strategy.created_at && (
                      <span className="text-sm text-gray-500">
                        {new Date(strategy.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm line-clamp-2">
                    {strategy.strategy_content}
                  </p>
                  {strategy.symbols && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {strategy.symbols.map(symbol => (
                        <Badge key={symbol} variant="secondary" className="text-xs">
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 