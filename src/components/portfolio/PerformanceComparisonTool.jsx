
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Eye, EyeOff, Brain, Calendar, BarChart3 } from 'lucide-react';
import SmartComparisonBuilder from './SmartComparisonBuilder';

// Mock stock data with percentage returns
const stockData = {
  user_portfolio: [
    { date: '2024-01-01', value: 100000, percentage: 0 }, 
    { date: '2024-02-01', value: 105000, percentage: 5 },
    { date: '2024-03-01', value: 98000, percentage: -2 }, 
    { date: '2024-04-01', value: 112000, percentage: 12 },
    { date: '2024-05-01', value: 108000, percentage: 8 }, 
    { date: '2024-06-01', value: 115000, percentage: 15 },
  ],
  NIFTY50: [
    { date: '2024-01-01', value: 21000, percentage: 0 }, 
    { date: '2024-02-01', value: 21500, percentage: 2.4 },
    { date: '2024-03-01', value: 20800, percentage: -0.95 }, 
    { date: '2024-04-01', value: 22100, percentage: 5.2 },
    { date: '2024-05-01', value: 21900, percentage: 4.3 }, 
    { date: '2024-06-01', value: 22400, percentage: 6.7 },
  ],
  TCS: [
    { date: '2024-01-01', value: 3500, percentage: 0 }, 
    { date: '2024-02-01', value: 3650, percentage: 4.3 },
    { date: '2024-03-01', value: 3400, percentage: -2.9 }, 
    { date: '2024-04-01', value: 3800, percentage: 8.6 },
    { date: '2024-05-01', value: 3750, percentage: 7.1 }, 
    { date: '2024-06-01', value: 3900, percentage: 11.4 },
  ]
};

const ALL_ASSET_KEYS = Object.keys(stockData);

function getRandomColor() {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default function PerformanceComparisonTool({ isDashboardWidget = false }) {
  const [comparisonKeys, setComparisonKeys] = useState(['NIFTY50', 'TCS']);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [hiddenLines, setHiddenLines] = useState({});
  const [showPercentage, setShowPercentage] = useState(true);
  const [timeframe, setTimeframe] = useState('6M');
  
  const allAssets = useMemo(() => {
    return ALL_ASSET_KEYS.reduce((acc, key) => {
      acc[key] = { name: key.replace(/_/g, ' '), color: getRandomColor() };
      return acc;
    }, {
      user_portfolio: { name: 'My Portfolio', color: '#10B981' }
    });
  }, []);

  const combinedChartData = useMemo(() => {
    const dates = new Set();
    const allKeys = ['user_portfolio', ...comparisonKeys];
    allKeys.forEach(key => {
      if (stockData[key]) stockData[key].forEach(item => dates.add(item.date));
    });

    const sortedDates = Array.from(dates).sort((a, b) => new Date(a) - new Date(b));

    return sortedDates.map(date => {
      const entry = { date };
      allKeys.forEach(key => {
        if (stockData[key]) {
          const dataPoint = stockData[key].find(d => d.date === date);
          if (dataPoint) {
            entry[key] = showPercentage ? dataPoint.percentage : dataPoint.value;
          } else {
            entry[key] = null;
          }
        }
      });
      return entry;
    });
  }, [comparisonKeys, showPercentage]);

  const toggleLineVisibility = (key) => {
    setHiddenLines(prev => ({...prev, [key]: !prev[key]}));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm p-3 border border-slate-600 rounded-lg shadow-lg">
          <p className="label text-slate-300 font-bold mb-2">{label}</p>
          {payload.map((p, i) => (
            !hiddenLines[p.dataKey] && typeof p.value === 'number' && (
              <p key={i} style={{ color: p.color }} className="text-sm font-medium">
                {`${allAssets[p.dataKey]?.name || p.dataKey}: ${showPercentage ? 
                  `${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)}%` : 
                  `₹${p.value.toLocaleString()}`}`}
              </p>
            )
          ))}
        </div>
      );
    }
    return null;
  };
  
  const CustomLegend = ({ payload }) => (
    <div className="flex flex-wrap justify-center items-center gap-4 mt-4">
      {payload.map((entry, index) => {
        const isHidden = hiddenLines[entry.dataKey];
        return(
          <div key={`item-${index}`} onClick={() => toggleLineVisibility(entry.dataKey)}
               className={`flex items-center gap-2 cursor-pointer transition-opacity ${isHidden ? 'opacity-50' : 'opacity-100'}`}>
            <div style={{ backgroundColor: entry.color }} className="w-3 h-3 rounded-full"/>
            <span className="text-sm text-slate-300">{entry.value}</span>
            {isHidden ? <EyeOff className="w-4 h-4 text-slate-500"/> : <Eye className="w-4 h-4 text-slate-400"/>}
          </div>
        )
      })}
    </div>
  );
  
  return (
    <div className="h-full flex flex-col">
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
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
              Value
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
              Returns %
            </Button>
          </div>
        </div>

        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              <Brain className="w-4 h-4 mr-2" /> 
              Build with AI
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-slate-900/95 backdrop-blur-md border-slate-700 z-50">
            <SmartComparisonBuilder onApply={(assets) => {
              setComparisonKeys(assets);
              setIsBuilderOpen(false);
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Chart Section */}
      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combinedChartData}>
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
              tickFormatter={(value) => showPercentage ? `${value}%` : `₹${(value/1000).toFixed(0)}k`} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />

            {['user_portfolio', ...comparisonKeys].map(key => (
              !hiddenLines[key] && (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={allAssets[key]?.color || '#8884d8'} 
                  strokeWidth={2.5} 
                  dot={false}
                  name={allAssets[key]?.name || key}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
