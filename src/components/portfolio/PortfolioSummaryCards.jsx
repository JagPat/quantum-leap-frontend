import React from 'react';
import MetricsCard from '../dashboard/MetricsCard';
import { DollarSign, TrendingUp, Briefcase } from 'lucide-react';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PortfolioSummaryCards({ summary, isLoading }) {
  const total_pnl_percent = summary?.total_pnl && summary?.total_investment ? (summary.total_pnl / summary.total_investment) * 100 : 0;
  const todays_pnl_percent = summary?.day_pnl && summary?.current_value ? (summary.day_pnl / (summary.current_value - summary.day_pnl)) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <MetricsCard
        title="Current Value"
        value={formatCurrency(summary?.current_value)}
        icon={Briefcase}
        trend={`Invested: ${formatCurrency(summary?.total_investment)}`}
        isLoading={isLoading}
      />
      <MetricsCard
        title="Today's P&L"
        value={formatCurrency(summary?.day_pnl)}
        icon={TrendingUp}
        change={summary?.day_pnl || 0}
        trend={`${(summary?.day_pnl || 0) >= 0 ? '+' : ''}${todays_pnl_percent.toFixed(2)}%`}
        isLoading={isLoading}
        className={ (summary?.day_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400' }
      />
      <MetricsCard
        title="Total P&L"
        value={formatCurrency(summary?.total_pnl)}
        icon={DollarSign}
        change={summary?.total_pnl || 0}
        trend={`Overall Return: ${(summary?.total_pnl || 0) >= 0 ? '+' : ''}${total_pnl_percent.toFixed(2)}%`}
        isLoading={isLoading}
        className={ (summary?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400' }
      />
    </div>
  );
}