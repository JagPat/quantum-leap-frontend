import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Brain,
  Clock
} from "lucide-react";
import { useAI } from '@/hooks/useAI';

export default function AISignalsWidget() {
  const { getSignals, loading } = useAI();
  const [signals, setSignals] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchSignals();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSignals = async () => {
    try {
      const data = await getSignals([]);
      setSignals(data?.signals?.slice(0, 3) || []); // Show top 3 signals
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch AI signals:', err);
    }
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
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const signalTime = new Date(timestamp);
    const diffMs = now - signalTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            AI Trading Signals
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSignals}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {lastRefresh && (
          <p className="text-xs text-gray-500">
            Updated {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.length > 0 ? (
          <>
            {signals.map((signal, index) => (
              <div key={signal.id || index} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{signal.symbol}</span>
                    <Badge className={getSignalColor(signal.signal_type)} size="sm">
                      {getSignalIcon(signal.signal_type)}
                      <span className="ml-1 capitalize text-xs">
                        {signal.signal_type?.replace('_', ' ')}
                      </span>
                    </Badge>
                  </div>
                  {signal.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(signal.confidence * 100)}%
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {signal.rationale || 'AI-generated signal'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  {signal.entry_price && (
                    <span>₹{signal.entry_price}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimeAgo(signal.generated_at || signal.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" className="w-full text-xs" asChild>
              <a href="/ai?tab=signals">
                View All Signals
              </a>
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-2">
              {loading ? 'Loading signals...' : 'No signals available'}
            </p>
            {!loading && (
              <Button variant="outline" size="sm" onClick={fetchSignals}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 