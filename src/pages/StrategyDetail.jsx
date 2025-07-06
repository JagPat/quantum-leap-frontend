
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Strategy, Trade, Watchlist, Position } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StockManager from '../components/trading/StockManager';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  Bot,
  Settings,
  Info,
  Save,
  CheckCircle
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { cloneDeep } from 'lodash';

const dummyStrategy = {
  id: "sample-strategy-123",
  name: "RSI Momentum Strategy",
  description: "Buy when RSI < 30, sell when RSI > 70 with momentum confirmation",
  type: "RSI",
  is_active: true,
  execution_mode: "paper",
  created_by_ai: true,
  running_since: "2024-06-01T00:00:00Z",
  last_executed: "2024-12-20T14:30:00Z",
  capital: {
    initial_capital: 200000,
    current_capital_used: 75000,
    available_capital: 125000
  },
  performance_metrics: {
    total_trades: 12,
    cycle_count: 4,
    win_rate: 75,
    avg_return: 3.8,
    avg_pnl_per_cycle: 1800,
    total_pnl: 7200,
    sharpe_ratio: 1.6
  },
  targeting: {
    mode: "manual",
    stocks: ["INFY", "TCS", "HDFCBANK", "RELIANCE", "WIPRO", "AXISBANK", "ICICIBANK"],
    watchlist_name: null
  },
  parameters: {
    rsi_oversold: 30,
    rsi_overbought: 70,
    confidence_threshold: 75
  }
};

const dummyTrades = [
  { id: 1, symbol: 'INFY', side: 'BUY', pnl: 1200, created_date: '2024-11-01T10:00:00Z' },
  { id: 2, symbol: 'TCS', side: 'SELL', pnl: 1800, created_date: '2024-11-15T14:30:00Z' },
  { id: 3, symbol: 'HDFCBANK', side: 'BUY', pnl: 2400, created_date: '2024-12-01T11:15:00Z' },
  { id: 4, symbol: 'RELIANCE', side: 'SELL', pnl: 1800, created_date: '2024-12-15T09:45:00Z' }
];

export default function StrategyDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [editableStrategy, setEditableStrategy] = useState(null);
  const [trades, setTrades] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [positions, setPositions] = useState([]); // NEW
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [strategyId, setStrategyId] = useState(null);

  const calculateAvailableCapital = () => {
    const initial = strategy?.capital?.initial_capital || 0;
    const used = strategy?.capital?.current_capital_used || 0;
    return initial - used;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('strategyId');
    setStrategyId(id);

    if (!id) {
      setStrategy(dummyStrategy);
      setEditableStrategy(cloneDeep(dummyStrategy));
      setTrades(dummyTrades);
      setWatchlists([]);
      setPositions([]); // For demo data
      setError("No strategy ID provided - showing demo data");
      setIsLoading(false);
    } else {
      loadStrategyData(id);
    }
  }, [location.search]);

  const loadStrategyData = async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      const [foundStrategy, allTrades, allWatchlists, allPositions] = await Promise.all([
        Strategy.get(id),
        Trade.filter({ strategy_id: id }),
        Watchlist.list(),
        Position.list()
      ]);

      if (foundStrategy) {
        setStrategy(foundStrategy);
        setEditableStrategy(cloneDeep(foundStrategy));
        setTrades(allTrades || []);
        setWatchlists(allWatchlists || []);
        setPositions(allPositions || []);
      } else {
        throw new Error(`Strategy with ID ${id} not found`);
      }
    } catch (err) {
      console.error("Error loading strategy:", err);
      setError(`Failed to load live data: ${err.message}. Showing demo data instead.`);
      setStrategy(dummyStrategy);
      setEditableStrategy(cloneDeep(dummyStrategy));
      setTrades(dummyTrades);
      setWatchlists([]);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editableStrategy || strategy.id === dummyStrategy.id) return;
    setIsSaving(true);
    setError(null);
    try {
      // If switching to watchlist, set stocks from the selected watchlist
      if (editableStrategy.targeting.mode === 'watchlist' && editableStrategy.targeting.watchlist_name) {
          const selectedWatchlist = watchlists.find(w => w.name === editableStrategy.targeting.watchlist_name);
          if (selectedWatchlist) {
            editableStrategy.targeting.stocks = selectedWatchlist.stocks;
          }
      } else if (editableStrategy.targeting.mode === 'portfolio') {
          // The backend will handle dynamic targeting based on the mode.
          // Clear static lists to avoid confusion.
          editableStrategy.targeting.stocks = [];
          editableStrategy.targeting.watchlist_name = null;
      }
      
      const { id, ...dataToUpdate } = editableStrategy;
      await Strategy.update(id, dataToUpdate);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadStrategyData(id);
    } catch (error) {
      console.error("Error saving strategy:", error);
      setError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (path, value) => {
    setEditableStrategy(prev => {
      const newStrategy = cloneDeep(prev);
      let current = newStrategy;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newStrategy;
    });
  };

  const handleToggleStrategy = async () => {
    if (!strategy || strategy.id === dummyStrategy.id) return;

    try {
      const newStatus = !strategy.is_active;
      await Strategy.update(strategy.id, { is_active: newStatus });
      setStrategy(prev => ({ ...prev, is_active: newStatus }));
      setEditableStrategy(prev => ({ ...prev, is_active: newStatus }));
    } catch (error) {
      console.error('Error toggling strategy:', error);
    }
  };

  const generatePnLChart = () => {
    let cumulativePnl = 0;
    return trades.map((trade, index) => {
      cumulativePnl += trade.pnl || 0;
      return {
        date: format(new Date(trade.created_date), 'MMM dd'),
        pnl: cumulativePnl,
        trade: index + 1
      };
    });
  };

  function MetricCard({ title, value, icon: Icon, trend, color }) {
    const textColor = color || "text-white";
    return (
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
          <Icon className="h-5 w-5 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
          {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
        </CardContent>
      </Card>
    );
  }

  const pnlChartData = generatePnLChart();

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
            <div className="h-8 bg-slate-700 rounded w-64"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-slate-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Trading'))}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              {strategy?.created_by_ai && <Bot className="w-7 h-7 text-amber-400" />}
              {strategy?.name || 'Strategy Detail'}
            </h1>
            <p className="text-slate-400 mt-1">{strategy?.description || 'Loading strategy details...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => strategyId ? loadStrategyData(strategyId) : null}
            className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Badge className={`${
            strategy?.is_active
              ? 'bg-green-500/20 text-green-300 border-green-500/30'
              : 'bg-red-500/20 text-red-300 border-red-500/30'
          }`}>
            {strategy?.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Switch
            checked={strategy?.is_active || false}
            onCheckedChange={handleToggleStrategy}
            disabled={!strategy || strategy.id === dummyStrategy.id}
            className={`${
              strategy?.is_active
                ? 'data-[state=checked]:bg-green-500'
                : 'data-[state=unchecked]:bg-red-500'
            }`}
          />
        </div>
      </div>

      {/* Strategy Summary Card - NEW */}
      <Card className="bg-slate-800/50 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Strategy Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Execution Mode</h4>
              <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 capitalize">
                {strategy?.execution_mode || 'Paper'}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Targeting Mode</h4>
              <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                {strategy?.targeting?.mode || 'Manual Selection'}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Target Stocks</h4>
              <div className="flex flex-wrap gap-1">
                {strategy?.targeting?.stocks?.slice(0, 4).map((stock) => (
                  <Badge key={stock} variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                    {stock}
                  </Badge>
                ))}
                {strategy?.targeting?.stocks?.length > 4 && (
                  <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                    +{strategy.targeting.stocks.length - 4} more
                  </Badge>
                )}
                {strategy?.targeting?.mode === 'portfolio' && (
                  <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                    Portfolio holdings
                  </Badge>
                )}
                {strategy?.targeting?.mode === 'ai_driven' && (
                  <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                    AI-driven selection
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2">Last Executed</h4>
              <span className="text-white text-sm">
                {strategy?.last_executed ? format(new Date(strategy.last_executed), 'MMM dd, HH:mm') : 'Never'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="mb-6 border-amber-500/20 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total P&L"
          value={`₹${strategy?.performance_metrics?.total_pnl?.toLocaleString() || '0'}`}
          icon={DollarSign}
          trend={`From ${strategy?.performance_metrics?.total_trades || 0} trades`}
          color={(strategy?.performance_metrics?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <MetricCard
          title="Win Rate"
          value={`${strategy?.performance_metrics?.win_rate || 0}%`}
          icon={Target}
          trend={`${strategy?.performance_metrics?.cycle_count || 0} cycles completed`}
        />
        <MetricCard
          title="Available Capital"
          value={`₹${calculateAvailableCapital().toLocaleString()}`}
          icon={Activity}
          trend={`of ₹${strategy?.capital?.initial_capital?.toLocaleString() || '0'} total`}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={strategy?.performance_metrics?.sharpe_ratio?.toFixed(2) || '0.00'}
          icon={BarChart3}
          trend="Risk-adjusted returns"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">
            Performance
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5" />
                Cumulative P&L Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pnlChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pnl"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trades.slice(-5).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={trade.side === 'BUY' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                        {trade.side}
                      </Badge>
                      <span className="font-medium text-white">{trade.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(trade.pnl || 0) >= 0 ? '+' : ''}₹{(trade.pnl || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(new Date(trade.created_date), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Trades</span>
                    <span className="font-semibold text-white">{strategy?.performance_metrics?.total_trades || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Win Rate</span>
                    <span className="font-semibold text-white">{strategy?.performance_metrics?.win_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Average Return</span>
                    <span className="font-semibold text-white">{strategy?.performance_metrics?.avg_return || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sharpe Ratio</span>
                    <span className="font-semibold text-white">{strategy?.performance_metrics?.sharpe_ratio || 0}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total P&L</span>
                    <span className={`font-semibold ${(strategy?.performance_metrics?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{(strategy?.performance_metrics?.total_pnl || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg P&L per Cycle</span>
                    <span className="font-semibold text-white">₹{(strategy?.performance_metrics?.avg_pnl_per_cycle || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cycle Count</span>
                    <span className="font-semibold text-white">{strategy?.performance_metrics?.cycle_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Running Since</span>
                    <span className="font-semibold text-white">
                      {strategy?.running_since ? format(new Date(strategy.running_since), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="w-5 h-5" />
                Strategy Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm text-slate-400">Strategy Name</Label>
                <Input
                  value={editableStrategy?.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="mt-1 bg-slate-900/50 rounded border border-slate-600 text-white"
                  disabled={strategy?.id === dummyStrategy.id}
                />
              </div>

              <div>
                <Label className="text-sm text-slate-400">Targeting Mode</Label>
                <Select
                  value={editableStrategy?.targeting?.mode || 'manual'}
                  onValueChange={(value) => handleFieldChange('targeting.mode', value)}
                  disabled={strategy?.id === dummyStrategy.id}
                >
                  <SelectTrigger className="w-full mt-1 bg-slate-900/50 rounded border border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white border-slate-700">
                    <SelectItem value="manual" className="hover:bg-slate-700">Manual Selection</SelectItem>
                    <SelectItem value="watchlist" className="hover:bg-slate-700">Watchlist-Based</SelectItem>
                    <SelectItem value="portfolio" className="hover:bg-slate-700">Portfolio-Based</SelectItem>
                    <SelectItem value="ai_driven" className="hover:bg-slate-700">AI-Driven</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editableStrategy?.targeting?.mode === 'manual' && (
                <div>
                  <Label className="text-sm text-slate-400">Target Stocks</Label>
                  <StockManager
                    stocks={editableStrategy?.targeting?.stocks || []}
                    onStocksChange={(newStocks) => handleFieldChange('targeting.stocks', newStocks)}
                    disabled={strategy?.id === dummyStrategy.id}
                  />
                </div>
              )}
              
              {editableStrategy?.targeting?.mode === 'watchlist' && (
                <div>
                  <Label className="text-sm text-slate-400">Select Watchlist</Label>
                  <Select
                    value={editableStrategy?.targeting?.watchlist_name || ''}
                    onValueChange={(value) => handleFieldChange('targeting.watchlist_name', value)}
                    disabled={strategy?.id === dummyStrategy.id}
                  >
                    <SelectTrigger className="w-full mt-1 bg-slate-900/50 rounded border border-slate-600 text-white">
                      <SelectValue placeholder="Choose a watchlist..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 text-white border-slate-700">
                      {watchlists.map(w => (
                        <SelectItem key={w.id} value={w.name} className="hover:bg-slate-700">
                          {w.name} ({w.stocks.length} stocks)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editableStrategy?.targeting?.mode === 'portfolio' && (
                <div>
                  <Label className="text-sm text-slate-400">Target Stocks (From Live Portfolio)</Label>
                  <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-600 min-h-[80px]">
                    {positions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {positions.map(p => (
                                <Badge key={p.id} variant="secondary" className="bg-slate-700 text-slate-300">
                                    {p.symbol}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">No positions found in your portfolio.</p>
                    )}
                     <p className="text-xs text-slate-500 mt-2">
                        This strategy will dynamically target all stocks currently in your portfolio.
                    </p>
                  </div>
                </div>
              )}
              
              {(editableStrategy?.targeting?.mode === 'ai_driven') && (
                <Alert className="border-blue-500/20 bg-blue-500/10">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    This targeting mode is under development and will be available soon.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="font-semibold mb-3 text-white">Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-slate-400">RSI Oversold</Label>
                    <Input
                      type="number"
                      value={editableStrategy?.parameters?.rsi_oversold || 30}
                      onChange={(e) => handleFieldChange('parameters.rsi_oversold', parseFloat(e.target.value))}
                      className="mt-1 bg-slate-900/50 rounded border border-slate-600 text-white"
                      disabled={strategy?.id === dummyStrategy.id}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-slate-400">RSI Overbought</Label>
                    <Input
                      type="number"
                      value={editableStrategy?.parameters?.rsi_overbought || 70}
                      onChange={(e) => handleFieldChange('parameters.rsi_overbought', parseFloat(e.target.value))}
                      className="mt-1 bg-slate-900/50 rounded border border-slate-600 text-white"
                      disabled={strategy?.id === dummyStrategy.id}
                    />
                  </div>
                </div>
              </div>

              {strategy?.id === dummyStrategy.id && (
                <Alert className="border-blue-500/20 bg-blue-500/10">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    This is demo data. Settings cannot be modified for the sample strategy.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="bg-slate-900/30 flex justify-end p-4">
              <Button onClick={handleSave} disabled={isSaving || strategy?.id === dummyStrategy.id}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
