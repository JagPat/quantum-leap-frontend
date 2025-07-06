import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'RELIANCE', pnl: 20237 },
  { name: 'INFY', pnl: -14981 },
  { name: 'TCS', pnl: 4368 },
  { name: 'HDFCBANK', pnl: 885 },
  { name: 'WIPRO', pnl: 1200 },
  { name: 'TATAMOTORS', pnl: -500 },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/80 backdrop-blur-sm p-2 border border-slate-600 rounded-lg">
          <p className="font-bold text-white">{label}</p>
          <p style={{ color: payload[0].payload.pnl >= 0 ? '#10B981' : '#EF4444' }}>
            P&L: ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
};

export default function PnLByStockChart() {
  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `₹${(value/1000)}k`} />
            <Tooltip content={<CustomTooltip/>}/>
            <Bar dataKey="pnl">
                {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                ))}
            </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
}