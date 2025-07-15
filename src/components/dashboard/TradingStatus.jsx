import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Activity } from 'lucide-react';

export default function TradingStatus({ isEngineRunning, activeStrategies, tradingMode }) {
  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bot className="w-5 h-5 text-amber-400" />
          Trading Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status</span>
          <Badge className={isEngineRunning ? 'bg-green-500' : 'bg-red-500'}>
            {isEngineRunning ? 'Running' : 'Stopped'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Mode</span>
          <Badge variant="outline" className="text-slate-300">
            {tradingMode || 'Sandbox'}
          </Badge>
        </div>
        
        <div>
          <span className="text-slate-400">Active Strategies</span>
          <div className="mt-2 space-y-1">
            {(activeStrategies || []).map((strategy, index) => (
              <div key={index} className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-green-400" />
                <span className="text-sm text-white">{strategy}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}