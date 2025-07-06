import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, GanttChartSquare, Calendar, BarChart3 } from 'lucide-react';

const strategyPerformanceData = [
  { date: '2024-01-01', MomentumBoost: 1000, MeanReversion: 500, ValueInvest: 200 },
  { date: '2024-02-01', MomentumBoost: 1200, MeanReversion: 450, ValueInvest: 250 },
  { date: '2024-03-01', MomentumBoost: 1500, MeanReversion: 600, ValueInvest: 220 },
  { date: '2024-04-01', MomentumBoost: 1300, MeanReversion: 750, ValueInvest: 300 },
  { date: '2024-05-01', MomentumBoost: 1800, MeanReversion: 700, ValueInvest: 350 },
  { date: '2024-06-01', MomentumBoost: 2200, MeanReversion: 650, ValueInvest: 400 },
];

const strategyPerformancePercentage = [
  { date: '2024-01-01', MomentumBoost: 0, MeanReversion: 0, ValueInvest: 0 },
  { date: '2024-02-01', MomentumBoost: 20, MeanReversion: -10, ValueInvest: 25 },
  { date: '2024-03-01', MomentumBoost: 50, MeanReversion: 20, ValueInvest: 10 },
  { date: '2024-04-01', MomentumBoost: 30, MeanReversion: 50, ValueInvest: 50 },
  { date: '2024-05-01', MomentumBoost: 80, MeanReversion: 40, ValueInvest: 75 },
  { date: '2024-06-01', MomentumBoost: 120, MeanReversion: 30, ValueInvest: 100 },
];

const strategyStats = [
  { name: 'MomentumBoost', trades: 15, winRate: 73, pnl: 2200, active: true, color: '#3B82F6' },
  { name: 'MeanReversion', trades: 22, winRate: 55, pnl: 650, active: true, color: '#10B981' },
  { name: 'ValueInvest', trades: 8, winRate: 88, pnl: 400, active: false, color: '#F59E0B' },
];

const CustomTooltip = ({ active, payload, label, showPercentage }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
        <p className="label text-slate-300 font-bold mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.stroke }} className="text-sm font-medium">
            {`${p.dataKey}: ${showPercentage ? 
              `${p.value >= 0 ? '+' : ''}${p.value}%` : 
              `₹${p.value.toLocaleString()}`}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PnlCard = ({ stat }) => (
  <Card className="bg-slate-800/50 border-slate-700">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg font-bold flex items-center gap-2" style={{color: stat.color}}>
        <GanttChartSquare />
        {stat.name}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      <div className="flex justify-between"><span>Total P&L:</span> <span className={`font-semibold ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{stat.pnl.toLocaleString()}</span></div>
      <div className="flex justify-between"><span>Trades:</span> <span className="font-semibold">{stat.trades}</span></div>
      <div className="flex justify-between"><span>Win Rate:</span> <span className="font-semibold">{stat.winRate}%</span></div>
      <div className="flex justify-between"><span>Status:</span> <span className="font-semibold">{stat.active ? 'Active' : 'Inactive'}</span></div>
    </CardContent>
  </Card>
);

export default function StrategyAttributionView() {
  const [timeframe, setTimeframe] = useState('6M');
  const [showPercentage, setShowPercentage] = useState(false);

  const currentData = showPercentage ? strategyPerformancePercentage : strategyPerformanceData;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Strategy P&L Contribution Over Time</CardTitle>
            
            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-24 bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="1M">1M</SelectItem>
                    <SelectItem value="3M">3M</SelectItem>
                    <SelectItem value="6M">6M</SelectItem>
                    <SelectItem value="1Y">1Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <div className="flex bg-slate-700 rounded-md p-1 border border-slate-600">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPercentage(false)}
                    className={`text-xs px-3 py-1 transition-all ${
                      !showPercentage 
                        ? 'bg-amber-500 text-slate-900 shadow-sm' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-600'
                    }`}
                  >
                    Value (₹)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPercentage(true)}
                    className={`text-xs px-3 py-1 transition-all ${
                      showPercentage 
                        ? 'bg-amber-500 text-slate-900 shadow-sm' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-600'
                    }`}
                  >
                    Returns (%)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                fontSize={12}
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(str) => {
                  const date = new Date(str);
                  return `${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().slice(-2)}`;
                }}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12} 
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(value) => showPercentage ? `${value}%` : `₹${value.toLocaleString()}`} 
              />
              <Tooltip content={<CustomTooltip showPercentage={showPercentage} />} />
              <Legend />
              {strategyStats.map(s => (
                <Line 
                  key={s.name} 
                  type="monotone" 
                  dataKey={s.name} 
                  stroke={s.color} 
                  strokeWidth={2.5} 
                  dot={false} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {strategyStats.map(stat => <PnlCard key={stat.name} stat={stat} />)}
      </div>
    </div>
  );
}