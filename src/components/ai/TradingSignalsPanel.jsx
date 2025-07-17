import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAI } from '@/hooks/useAI';

const SIGNAL_TYPES = [
  { value: 'all', label: 'All Signals' },
  { value: 'buy', label: 'Buy Signals' },
  { value: 'sell', label: 'Sell Signals' },
  { value: 'hold', label: 'Hold Signals' }
];

const CONFIDENCE_FILTERS = [
  { value: 'all', label: 'All Confidence Levels' },
  { value: 'high', label: 'High Confidence (80%+)' },
  { value: 'medium', label: 'Medium Confidence (60-79%)' },
  { value: 'low', label: 'Low Confidence (<60%)' }
];

export default function TradingSignalsPanel() {
  const { toast } = useToast();
  const { getSignals, loading, error } = useAI();
  
  const [signals, setSignals] = useState([]);
  const [filteredSignals, setFilteredSignals] = useState([]);
  const [filters, setFilters] = useState({
    symbols: '',
    signal_type: 'all',
    confidence: 'all',
    timeframe: 'all'
  });
  
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch signals on component mount and set up auto-refresh
  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Apply filters when signals or filters change
  useEffect(() => {
    applyFilters();
  }, [signals, filters]);

  const fetchSignals = async (symbolList = []) => {
    try {
      const data = await getSignals(symbolList);
      setSignals(data?.signals || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch signals:', err);
      toast({
        title: "Failed to Load Signals",
        description: err.message || "Could not fetch trading signals",
        variant: "destructive",
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...signals];

    // Filter by symbols
    if (filters.symbols.trim()) {
      const symbolList = filters.symbols.split(',').map(s => s.trim().toUpperCase());
      filtered = filtered.filter(signal => 
        symbolList.some(symbol => signal.symbol?.includes(symbol))
      );
    }

    // Filter by signal type
    if (filters.signal_type !== 'all') {
      filtered = filtered.filter(signal => 
        signal.signal_type?.toLowerCase() === filters.signal_type
      );
    }

    // Filter by confidence level
    if (filters.confidence !== 'all') {
      const confidenceThresholds = {
        high: 0.8,
        medium: 0.6,
        low: 0
      };
      
      const minConfidence = confidenceThresholds[filters.confidence];
      const maxConfidence = filters.confidence === 'low' ? 0.6 : 1;
      
      filtered = filtered.filter(signal => 
        signal.confidence >= minConfidence && signal.confidence < maxConfidence
      );
    }

    setFilteredSignals(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    const symbolList = filters.symbols ? 
      filters.symbols.split(',').map(s => s.trim().toUpperCase()) : [];
    fetchSignals(symbolList);
  };

  const getSignalColor = (signalType) => {
    switch (signalType?.toLowerCase()) {
      case 'buy':
      case 'strong_buy':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'sell':
      case 'strong_sell':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'hold':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getSignalIcon = (signalType) => {
    switch (signalType?.toLowerCase()) {
      case 'buy':
      case 'strong_buy':
        return <ArrowUpCircle className="h-4 w-4" />;
      case 'sell':
      case 'strong_sell':
        return <ArrowDownCircle className="h-4 w-4" />;
      case 'hold':
        return <Minus className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const signalTime = new Date(timestamp);
    const diffMs = now - signalTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Trading Signals
              {signals.length > 0 && (
                <Badge variant="secondary">
                  {filteredSignals.length} of {signals.length}
                </Badge>
              )}
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
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Filter symbols (e.g., RELIANCE)"
                value={filters.symbols}
                onChange={(e) => handleFilterChange('symbols', e.target.value)}
              />
            </div>
            
            <Select 
              value={filters.signal_type} 
              onValueChange={(value) => handleFilterChange('signal_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNAL_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.confidence} 
              onValueChange={(value) => handleFilterChange('confidence', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_FILTERS.map(conf => (
                  <SelectItem key={conf.value} value={conf.value}>
                    {conf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              {filteredSignals.length} signals
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Signals List */}
      {filteredSignals.length > 0 ? (
        <div className="space-y-4">
          {filteredSignals.map((signal, index) => (
            <Card key={signal.id || index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {signal.symbol && (
                          <h3 className="text-lg font-semibold">{signal.symbol}</h3>
                        )}
                        <Badge className={getSignalColor(signal.signal_type)}>
                          {getSignalIcon(signal.signal_type)}
                          <span className="ml-1 capitalize">
                            {signal.signal_type?.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                      
                      {signal.confidence && (
                        <Badge className={getConfidenceColor(signal.confidence)}>
                          {Math.round(signal.confidence * 100)}% Confidence
                        </Badge>
                      )}
                      
                      {signal.timeframe && (
                        <Badge variant="outline">{signal.timeframe}</Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3">
                      {signal.rationale || signal.description || 'No description available'}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {signal.entry_price && (
                        <div>
                          <span className="text-gray-600">Entry Price:</span>
                          <div className="font-medium">₹{signal.entry_price}</div>
                        </div>
                      )}
                      
                      {signal.target_price && (
                        <div>
                          <span className="text-gray-600">Target:</span>
                          <div className="font-medium text-green-600">₹{signal.target_price}</div>
                        </div>
                      )}
                      
                      {signal.stop_loss && (
                        <div>
                          <span className="text-gray-600">Stop Loss:</span>
                          <div className="font-medium text-red-600">₹{signal.stop_loss}</div>
                        </div>
                      )}
                      
                      {signal.risk_reward_ratio && (
                        <div>
                          <span className="text-gray-600">Risk/Reward:</span>
                          <div className="font-medium">1:{signal.risk_reward_ratio}</div>
                        </div>
                      )}
                    </div>
                    
                    {signal.key_levels && signal.key_levels.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">Key Levels: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {signal.key_levels.map((level, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              ₹{level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(signal.generated_at || signal.timestamp)}
                    </div>
                    {signal.expires_at && (
                      <div className="mt-1">
                        Expires: {new Date(signal.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {loading ? 'Loading Signals...' : 'No Trading Signals'}
              </h3>
              <p className="text-gray-500 mb-4">
                {loading 
                  ? 'AI is analyzing market conditions...'
                  : filters.symbols.trim()
                    ? 'No signals found for the specified filters'
                    : 'AI trading signals will appear here when available'
                }
              </p>
              {!loading && (
                <Button onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Signals
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 