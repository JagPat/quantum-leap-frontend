import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, TrendingUp, TrendingDown, Settings } from 'lucide-react';

export default function StrategyPreview({ strategy, onSave }) {
  if (!strategy) return null;

  return (
    <Card className="bg-slate-800 border-slate-700 text-white animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="w-6 h-6 text-green-500" />
          AI Generated Strategy Preview
        </CardTitle>
        <CardDescription>{strategy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Parameters
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(strategy.parameters).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="bg-slate-700 text-slate-300">
                {key.replace(/_/g, ' ')}: <span className="font-bold ml-1">{String(value)}</span>
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" /> Buy Conditions
          </h4>
          <div className="space-y-1">
            {strategy.conditions.buy.map((cond, i) => (
              <p key={i} className="text-sm font-mono p-2 bg-slate-700 rounded flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-green-400" /> {cond}
              </p>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" /> Sell Conditions
          </h4>
          <div className="space-y-1">
            {strategy.conditions.sell.map((cond, i) => (
              <p key={i} className="text-sm font-mono p-2 bg-slate-700 rounded flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-red-400" /> {cond}
              </p>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button onClick={onSave} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-2" />
            Save and Activate Strategy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}