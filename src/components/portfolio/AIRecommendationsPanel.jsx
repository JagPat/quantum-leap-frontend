import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight, BrainCircuit, RefreshCw } from 'lucide-react';

const recommendations = [
  { id: 1, type: 'rebalance', symbol: 'INFY', reason: 'High concentration. Reduce exposure from 33% to 25%.' },
  { id: 2, type: 'buy', symbol: 'TATA MOTORS', reason: 'Strong positive sentiment and breakout potential.' },
  { id: 3, type: 'hold', symbol: 'RELIANCE', reason: 'Currently in a strong uptrend. Continue holding.' },
];

export default function AIRecommendationsPanel() {
  return (
    <Card className="bg-slate-800/50 border-white/10 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BrainCircuit className="w-5 h-5 text-amber-400"/>
          AI Insights
        </CardTitle>
        <CardDescription>Powered by QuantumLeap AI</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {recommendations.map(rec => (
          <div key={rec.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-white">{rec.symbol}</p>
              <Badge 
                variant={rec.type === 'buy' ? 'default' : (rec.type === 'hold' ? 'secondary' : 'destructive')}
                className={`text-xs capitalize ${
                  rec.type === 'buy' && 'bg-green-500/20 text-green-300 border-green-500/30'
                } ${
                  rec.type === 'hold' && 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                } ${
                  rec.type === 'rebalance' && 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                }`}
              >
                {rec.type}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">{rec.reason}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="border-t border-white/10 pt-4">
        <Button variant="outline" className="w-full text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
          <RefreshCw className="w-4 h-4 mr-2"/>
          Re-analyze Portfolio
        </Button>
      </CardFooter>
    </Card>
  );
}