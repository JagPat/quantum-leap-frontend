import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Plus, 
  X, 
  Search, 
  Bot,
  List,
  Wallet,
  Filter,
  Zap
} from 'lucide-react';
import { Strategy } from '@/api/entities';
import { InvokeLLM } from '@/api/integrations';

const NIFTY_50_STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'SBIN', 'BHARTIARTL',
  'ITC', 'KOTAKBANK', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA', 'ULTRACEMCO',
  'TITAN', 'NESTLEIND', 'POWERGRID', 'NTPC', 'TECHM', 'HCLTECH', 'WIPRO', 'ONGC',
  'TATAMOTORS', 'BAJFINANCE', 'DIVISLAB', 'APOLLOHOSP', 'ADANIPORTS', 'TATASTEEL',
  'COALINDIA', 'DRREDDY', 'EICHERMOT', 'INDUSINDBK', 'GRASIM', 'CIPLA', 'JSWSTEEL',
  'BRITANNIA', 'HINDALCO', 'HEROMOTOCO', 'BAJAJFINSV', 'SBILIFE', 'SHREECEM', 'UPL',
  'HDFCLIFE', 'BPCL', 'TATACONSUM', 'BAJAJ-AUTO', 'M&M', 'ADANIENT'
];

const WATCHLISTS = [
  { name: 'NIFTY 50', stocks: NIFTY_50_STOCKS },
  { name: 'NIFTY IT', stocks: ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM', 'LTTS', 'MPHASIS'] },
  { name: 'NIFTY Bank', stocks: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK'] },
  { name: 'NIFTY Pharma', stocks: ['SUNPHARMA', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'LUPIN', 'AUROBINDO'] }
];

export default function StrategyTargeting({ strategy, onUpdate }) {
  const [targeting, setTargeting] = useState(strategy.targeting || {
    mode: 'manual',
    stocks: [],
    watchlist_name: '',
    rules: {}
  });
  const [newStock, setNewStock] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const handleModeChange = (mode) => {
    const updatedTargeting = { ...targeting, mode };
    
    // Auto-populate based on mode
    if (mode === 'watchlist' && !updatedTargeting.watchlist_name) {
      updatedTargeting.watchlist_name = 'NIFTY 50';
      updatedTargeting.stocks = NIFTY_50_STOCKS;
    } else if (mode === 'portfolio') {
      // In a real app, this would fetch user's current holdings
      updatedTargeting.stocks = ['RELIANCE', 'TCS', 'INFY']; // Mock data
    }
    
    setTargeting(updatedTargeting);
  };

  const addStock = () => {
    if (newStock && !targeting.stocks.includes(newStock.toUpperCase())) {
      const updatedTargeting = {
        ...targeting,
        stocks: [...targeting.stocks, newStock.toUpperCase()]
      };
      setTargeting(updatedTargeting);
      setNewStock('');
    }
  };

  const removeStock = (stockToRemove) => {
    const updatedTargeting = {
      ...targeting,
      stocks: targeting.stocks.filter(stock => stock !== stockToRemove)
    };
    setTargeting(updatedTargeting);
  };

  const handleWatchlistChange = (watchlistName) => {
    const selectedWatchlist = WATCHLISTS.find(w => w.name === watchlistName);
    const updatedTargeting = {
      ...targeting,
      watchlist_name: watchlistName,
      stocks: selectedWatchlist ? selectedWatchlist.stocks : []
    };
    setTargeting(updatedTargeting);
  };

  const getAISuggestions = async () => {
    setIsLoading(true);
    try {
      const prompt = `Based on the strategy "${strategy.name}" of type "${strategy.type}", suggest 5-8 Indian stocks that would be most suitable for this trading strategy. Consider factors like volatility, liquidity, and technical characteristics. Return only stock symbols separated by commas (e.g., RELIANCE, TCS, INFY).`;
      
      const response = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true
      });

      const suggestions = response.split(',').map(stock => stock.trim().toUpperCase()).filter(Boolean);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
    setIsLoading(false);
  };

  const applySuggestions = () => {
    const updatedTargeting = {
      ...targeting,
      mode: 'ai_driven',
      stocks: aiSuggestions
    };
    setTargeting(updatedTargeting);
  };

  const handleSave = async () => {
    try {
      await Strategy.update(strategy.id, { targeting });
      onUpdate(targeting);
    } catch (error) {
      console.error('Error updating targeting:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Stock Targeting Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={targeting.mode} onValueChange={handleModeChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-700">
              <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
              <TabsTrigger value="watchlist" className="text-xs">Watchlist</TabsTrigger>
              <TabsTrigger value="portfolio" className="text-xs">Portfolio</TabsTrigger>
              <TabsTrigger value="rule_based" className="text-xs">Rule-Based</TabsTrigger>
              <TabsTrigger value="ai_driven" className="text-xs">AI Driven</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter stock symbol (e.g., RELIANCE)"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value.toUpperCase())}
                    className="bg-slate-700 border-slate-600 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && addStock()}
                  />
                  <Button onClick={addStock} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {targeting.stocks.map((stock) => (
                    <Badge key={stock} variant="outline" className="bg-slate-700 text-white border-slate-600">
                      {stock}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStock(stock)}
                        className="ml-2 h-auto p-0 text-slate-400 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="watchlist" className="mt-4">
              <div className="space-y-4">
                <Select value={targeting.watchlist_name} onValueChange={handleWatchlistChange}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select a watchlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {WATCHLISTS.map((watchlist) => (
                      <SelectItem key={watchlist.name} value={watchlist.name}>
                        {watchlist.name} ({watchlist.stocks.length} stocks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targeting.watchlist_name && (
                  <div className="text-sm text-slate-400">
                    Selected: {targeting.stocks.length} stocks from {targeting.watchlist_name}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="portfolio" className="mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Portfolio-Based Targeting</span>
                </div>
                <p className="text-sm text-blue-700">
                  This mode will apply the strategy to all stocks in your current portfolio.
                  Currently targeting: {targeting.stocks.length} holdings
                </p>
              </div>
            </TabsContent>

            <TabsContent value="rule_based" className="mt-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Rule-Based Targeting</span>
                </div>
                <p className="text-sm text-purple-700 mb-3">
                  Define dynamic rules to automatically select stocks that match specific criteria.
                </p>
                <div className="text-sm text-purple-600">
                  Coming Soon: Advanced rule builder for dynamic stock selection
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai_driven" className="mt-4">
              <div className="space-y-4">
                {!aiSuggestions.length ? (
                  <div className="text-center py-6">
                    <Bot className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      AI-Powered Stock Selection
                    </h3>
                    <p className="text-slate-400 mb-4">
                      Let our AI analyze your strategy and suggest the best stocks to target.
                    </p>
                    <Button onClick={getAISuggestions} disabled={isLoading} className="bg-amber-500 hover:bg-amber-600">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Get AI Suggestions
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">AI Recommendations</h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {aiSuggestions.map((stock) => (
                          <Badge key={stock} className="bg-green-100 text-green-800">
                            {stock}
                          </Badge>
                        ))}
                      </div>
                      <Button onClick={applySuggestions} size="sm" className="bg-green-600 hover:bg-green-700">
                        Apply These Suggestions
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current Selection Summary */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Current Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400">Mode: <span className="text-white capitalize">{targeting.mode.replace('_', ' ')}</span></p>
              <p className="text-slate-400">Stocks: <span className="text-white">{targeting.stocks.length}</span></p>
            </div>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targeting.stocks.map((stock) => (
              <Badge key={stock} variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                {stock}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}