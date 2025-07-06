import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Zap, Pause, Play, AlertTriangle } from "lucide-react";

export default function TradingStatus({ 
  isEngineRunning = true, 
  activeStrategies = ['RSI', 'MACD'], 
  lastSignal = null,
  onToggleEngine,
  tradingMode = 'sandbox'
}) {
  return (
    <div className="h-full w-full flex flex-col bg-slate-800/50 border border-white/10 rounded-lg">
      <div className="p-4 pb-2">
        <h3 className="flex items-center justify-between text-white font-semibold">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Trading Engine
          </span>
          <Badge 
            variant={isEngineRunning ? "default" : "secondary"}
            className={`${
              isEngineRunning 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {isEngineRunning ? 'Active' : 'Paused'}
          </Badge>
        </h3>
      </div>
      
      <div className="flex-1 p-4 pt-2 space-y-4 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isEngineRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
            }`} />
            <span className="text-sm text-slate-300">
              {isEngineRunning ? 'Scanning markets...' : 'Engine paused'}
            </span>
          </div>
          <Button
            variant={isEngineRunning ? "outline" : "default"}
            size="sm"
            onClick={onToggleEngine}
            className={`${
              isEngineRunning 
                ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isEngineRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>

        <div className="border-t border-white/10 pt-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Active Strategies</span>
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
              {activeStrategies.length} active
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeStrategies.map((strategy) => (
              <Badge key={strategy} variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {strategy}
              </Badge>
            ))}
          </div>
        </div>

        {lastSignal && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Last Signal</span>
              <Badge 
                variant={lastSignal.type === 'BUY' ? 'default' : 'secondary'}
                className={`text-xs ${
                  lastSignal.type === 'BUY' 
                    ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                }`}
              >
                {lastSignal.type}
              </Badge>
            </div>
            <div className="text-sm text-slate-300">
              <p className="font-medium text-white">{lastSignal.symbol}</p>
              <p className="text-xs text-slate-400">
                Confidence: {lastSignal.confidence}% • {lastSignal.time}
              </p>
            </div>
          </div>
        )}

        {tradingMode === 'sandbox' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-auto">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Sandbox Mode</span>
            </div>
            <p className="text-xs text-amber-400 mt-1">
              All trades are simulated. No real money is involved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}