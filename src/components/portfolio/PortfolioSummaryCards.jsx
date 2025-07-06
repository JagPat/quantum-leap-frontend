import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUp, ArrowDown } from 'lucide-react';

const MetricCard = ({ title, value, change, isPositive, icon: Icon, changeType = "absolute" }) => {
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const ChangeIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <Card className="bg-slate-800/50 border-white/10 hover:bg-slate-800 transition-colors duration-300 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <Icon className="h-5 w-5 text-slate-500" />
      </CardHeader>
      <CardContent className="flex flex-col justify-between h-full">
        <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
          {value}
        </div>
        <div className={`text-xs flex items-center ${changeColor}`}>
          <ChangeIcon className="w-3 h-3 mr-1" />
          <span>{change} {changeType === 'percent' ? '%' : ''}</span>
          <span className="text-slate-500 ml-1">vs yesterday</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PortfolioSummaryCards({ summary }) {
  const { 
    total_value = 0, 
    total_pnl = 0, 
    total_pnl_percent = 0, 
    todays_pnl = 0, 
    todays_pnl_percent = 0 
  } = summary || {};

  return (
    <div className="h-full w-full p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        <MetricCard
          title="Total Portfolio Value"
          value={`₹${total_value.toLocaleString('en-IN')}`}
          change={todays_pnl.toLocaleString('en-IN')}
          isPositive={todays_pnl >= 0}
          icon={DollarSign}
        />
        <MetricCard
          title="Total P&L"
          value={`₹${total_pnl.toLocaleString('en-IN')}`}
          change={total_pnl_percent.toFixed(2)}
          isPositive={total_pnl >= 0}
          icon={TrendingUp}
          changeType="percent"
        />
        <MetricCard
          title="Today's P&L"
          value={`₹${todays_pnl.toLocaleString('en-IN')}`}
          change={todays_pnl_percent.toFixed(2)}
          isPositive={todays_pnl >= 0}
          icon={TrendingUp}
          changeType="percent"
        />
        <MetricCard
          title="Asset Allocation"
          value="View Details"
          change="Diversified"
          isPositive={true}
          icon={PieChart}
        />
      </div>
    </div>
  );
}