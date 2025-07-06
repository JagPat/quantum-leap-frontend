
import React, { useState, useEffect } from "react";
import { Strategy, Trade, User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import StrategyBuilder from '../components/trading/StrategyBuilder';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Settings,
  Bot,
  Copy,
  Trash2,
  Edit,
  Play,
  Pause,
  Eye,
  TrendingUp
} from "lucide-react";

export default function Trading() {
  const [strategies, setStrategies] = useState([]);
  const [isEngineRunning, setIsEngineRunning] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  useEffect(() => {
    loadTradingData();
  }, []);

  const loadTradingData = async () => {
    setIsLoading(true);
    try {
      const [strategiesData, userData] = await Promise.all([
        Strategy.list(),
        User.me()
      ]);

      setStrategies(strategiesData);
      setUser(userData);
    } catch (error) {
      console.error("Error loading trading data:", error);
    }
    setIsLoading(false);
  };

  const handleToggleEngine = () => {
    setIsEngineRunning(!isEngineRunning);
  };

  const handleToggleStrategy = async (strategyId, isActive) => {
    try {
      await Strategy.update(strategyId, { is_active: isActive });
      setStrategies(prev =>
        prev.map(strategy =>
          strategy.id === strategyId
            ? { ...strategy, is_active: isActive }
            : strategy
        )
      );
    } catch (error) {
      console.error("Error updating strategy:", error);
    }
  };

  const createNewStrategy = async (strategyData) => {
    try {
      // If no data is passed, use the default AI strategy creation
      const dataToCreate = strategyData || {
        name: `AI Strategy ${strategies.length + 1}`,
        type: 'RSI',
        parameters: {
          rsi_oversold: 30,
          rsi_overbought: 70,
          confidence_threshold: 75
        },
        is_active: true,
        created_by_ai: true
      };
      const newStrategy = await Strategy.create(dataToCreate);

      setStrategies(prev => [...prev, newStrategy]);
      setIsBuilderOpen(false); // Close builder on successful creation
    } catch (error) {
      console.error("Error creating strategy:", error);
    }
  };

  const handleDeleteStrategy = async (strategyId) => {
    if (confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
        try {
            await Strategy.delete(strategyId);
            setStrategies(prev => prev.filter(s => s.id !== strategyId));
        } catch (error) {
            console.error("Error deleting strategy:", error);
            alert('Failed to delete the strategy.');
        }
    }
  };

  const handleDuplicateStrategy = async (strategy) => {
    try {
        const { id, created_date, updated_date, ...strategyToCopy } = strategy;
        const newStrategyData = {
            ...strategyToCopy,
            name: `${strategy.name} (Copy)`,
            is_active: false, // Start as inactive
        };
        const newStrategy = await Strategy.create(newStrategyData);
        setStrategies(prev => [...prev, newStrategy]);
    } catch(error) {
        console.error("Error duplicating strategy:", error);
        alert('Failed to duplicate the strategy.');
    }
  };

  const StrategyCard = ({ strategy }) => (
    <Card className="bg-slate-800/50 border-white/10 text-white hover:bg-slate-800/70 transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            {strategy.created_by_ai && <Bot className="w-5 h-5 text-amber-400" />}
            <div>
              <h3 className="font-bold">{strategy.name}</h3>
              <p className="text-sm text-slate-400 font-normal">{strategy.description}</p>
            </div>
          </span>
          <Switch
            checked={strategy.is_active}
            onCheckedChange={(checked) => handleToggleStrategy(strategy.id, checked)}
            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Target Stocks</span>
          <div className="flex flex-wrap gap-1 max-w-32 justify-end">
            {strategy.targeting?.stocks?.slice(0, 3).map((stock) => (
              <Badge key={stock} variant="outline" className="text-xs bg-slate-700 text-slate-300 border-slate-600">
                {stock}
              </Badge>
            ))}
            {strategy.targeting?.stocks?.length > 3 && (
              <Badge variant="outline" className="text-xs bg-slate-700 text-slate-300 border-slate-600">
                +{strategy.targeting.stocks.length - 3}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Capital</span>
          <span className="font-semibold">₹{(strategy.capital?.initial_capital || 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">P&L (Total)</span>
          <span className={`font-semibold flex items-center gap-1 ${
            (strategy.performance_metrics?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            <TrendingUp className="w-4 h-4" />
            {(strategy.performance_metrics?.total_pnl || 0) >= 0 ? '+' : ''}₹{(strategy.performance_metrics?.total_pnl || 0).toLocaleString()}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-slate-900/40 p-3">
        <Link
          to={createPageUrl(`StrategyDetail?strategyId=${strategy.id}`)}
          className="inline-flex items-center text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
        >
          View Details <Eye className="ml-2 w-4 h-4" />
        </Link>
        <TooltipProvider>
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-700 hover:text-white">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`StrategyDetail?strategyId=${strategy.id}&tab=targeting`)} className="cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Adjust Targeting
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`StrategyDetail?strategyId=${strategy.id}&tab=settings`)} className="cursor-pointer">
                     <Settings className="w-4 h-4 mr-2" />
                     Edit Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700"/>
                <DropdownMenuItem onClick={() => handleDuplicateStrategy(strategy)} className="cursor-pointer">
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteStrategy(strategy.id)} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/20">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent side="top" className="bg-slate-800 text-white border-slate-700">
              <p>Strategy Actions</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );

  return (
    <>
      <StrategyBuilder
        isOpen={isBuilderOpen}
        onOpenChange={setIsBuilderOpen}
        onSaveStrategy={createNewStrategy}
      />
      <div className="p-4 md:p-6 space-y-6 bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Trading Engine</h1>
            <p className="text-slate-400 mt-1">Manage your AI-powered trading strategies.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant={isEngineRunning ? "outline" : "default"}
              onClick={handleToggleEngine}
              className={`${
                isEngineRunning
                  ? 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isEngineRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Engine
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Engine
                </>
              )}
            </Button>
            <Button onClick={() => setIsBuilderOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              <Bot className="w-4 h-4 mr-2" />
              Build with AI
            </Button>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
          {/* Add New Strategy Card */}
          <Card className="bg-slate-800/50 border-dashed border-2 border-slate-600 hover:border-amber-500 transition-colors">
            <CardContent className="flex flex-col items-center justify-center text-center h-full p-6">
              <Bot className="w-12 h-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Build a Custom Strategy
              </h3>
              <p className="text-sm text-slate-400 mb-6 max-w-xs">
                Use our conversational AI to create a new trading strategy from your ideas.
              </p>
              <Button onClick={() => setIsBuilderOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
                <Bot className="w-4 h-4 mr-2" />
                Start Building
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
