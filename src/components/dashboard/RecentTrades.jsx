import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";

export default function RecentTrades({ trades = [], onViewAll }) {
  const TradeCard = ({ trade }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
          trade.side === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {trade.side === 'BUY' ? (
            <ArrowUpRight className="w-5 h-5 text-green-400" />
          ) : (
            <ArrowDownRight className="w-5 h-5 text-red-400" />
          )}
        </div>
        <div>
          <p className="font-semibold text-white">{trade.symbol}</p>
          <p className="text-sm text-slate-400">{trade.quantity} shares at ₹{trade.price.toFixed(2)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${
          trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {trade.pnl >= 0 ? `+₹${trade.pnl.toFixed(2)}` : `-₹${Math.abs(trade.pnl).toFixed(2)}`}
        </p>
        <p className="text-xs text-slate-500">{new Date(trade.created_date).toLocaleDateString()}</p>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col bg-slate-800/50 border border-white/10 rounded-lg">
      <div className="flex flex-row items-center justify-between p-4 pb-2">
        <h3 className="text-white font-semibold">Recent Trades</h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-amber-400 hover:text-amber-300">
          View All <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {trades.length === 0 ? (
          <div className="text-center py-10 text-slate-400 flex items-center justify-center h-full">
            <p>No recent trades to display.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.slice(0, 5).map(trade => (
              <TradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}