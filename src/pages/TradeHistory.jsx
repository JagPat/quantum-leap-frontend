import React from 'react';
import TradeHistoryTable from '../components/dashboard/TradeHistoryTable';

export default function TradeHistoryPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 md:p-6">
        <TradeHistoryTable />
      </div>
    </div>
  );
}