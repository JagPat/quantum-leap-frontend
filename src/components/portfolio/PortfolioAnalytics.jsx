
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';

const data = {
  daily: [
    { name: '9:15', value: 345044, percentage: 0 }, 
    { name: '10:00', value: 345500, percentage: 0.13 }, 
    { name: '11:00', value: 345200, percentage: 0.05 },
    { name: '12:00', value: 346000, percentage: 0.28 }, 
    { name: '1:00', value: 346300, percentage: 0.36 }, 
    { name: '2:00', value: 345900, percentage: 0.25 },
    { name: '3:30', value: 346255, percentage: 0.35 }
  ],
  weekly: [
    { name: 'Mon', value: 342000, percentage: -1.2 }, 
    { name: 'Tue', value: 343500, percentage: -0.8 }, 
    { name: 'Wed', value: 342800, percentage: -1.0 },
    { name: 'Thu', value: 345100, percentage: -0.3 }, 
    { name: 'Fri', value: 346255, percentage: 0.35 }
  ],
  monthly: [
    { name: 'Week 1', value: 335000, percentage: -3.2 }, 
    { name: 'Week 2', value: 338000, percentage: -2.4 },
    { name: 'Week 3', value: 342000, percentage: -1.2 }, 
    { name: 'Week 4', value: 346255, percentage: 0.35 }
  ],
  yearly: [
    { name: 'Q1', value: 320000, percentage: -7.6 },
    { name: 'Q2', value: 335000, percentage: -3.2 },
    { name: 'Q3', value: 342000, percentage: -1.2 },
    { name: 'Q4', value: 346255, percentage: 0.35 }
  ]
};

const CustomTooltip = ({ active, payload, label, showPercentage }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const percentage = payload[0].payload.percentage;
    
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
        <p className="label text-slate-300 font-bold mb-1">{label}</p>
        {showPercentage ? (
          <p className="text-amber-400 font-semibold">
            {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
          </p>
        ) : (
          <p className="text-amber-400 font-semibold">
            ₹{value.toLocaleString('en-IN')}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function PortfolioAnalytics({ isDashboardWidget = false }) {
  const [timeframe, setTimeframe] = useState('daily');
  const [showPercentage, setShowPercentage] = useState(false);

  const currentData = data[timeframe];
  const dataKey = showPercentage ? 'percentage' : 'value';

  return (
    <div className="h-full flex flex-col">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32 bg-slate-700 border-slate-600">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
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

      {/* Chart Section */}
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={currentData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={12}
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12}
              tick={{ fill: '#94a3b8' }}
              tickFormatter={(value) => {
                if (showPercentage) {
                  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                } else {
                  return `₹${(value/1000).toFixed(0)}k`;
                }
              }}
              domain={showPercentage ? ['dataMin - 0.5', 'dataMax + 0.5'] : ['dataMin - 1000', 'dataMax + 1000']}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <Tooltip content={<CustomTooltip showPercentage={showPercentage} />} />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke="#f59e0b" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={2.5} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
