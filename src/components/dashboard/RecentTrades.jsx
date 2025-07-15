import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

export default function RecentTrades({ trades = [] }) {
  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="w-5 h-5 text-blue-400" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No recent trades</p>
            <p className="text-sm text-slate-500">Activity will appear here once trading begins</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.slice(0, 5).map((trade, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-b-0">
                <div className="flex items-center gap-3">
                  {trade.side === 'BUY' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <div>
                    <div className="text-white font-medium">{trade.symbol}</div>
                    <div className="text-xs text-slate-400">{trade.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={trade.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                    {trade.side}
                  </Badge>
                  <div className="text-sm text-slate-300 mt-1">
                    ₹{trade.price?.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}