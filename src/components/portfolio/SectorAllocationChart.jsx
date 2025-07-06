
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'IT', value: 400 },
  { name: 'Finance', value: 300 },
  { name: 'FMCG', value: 300 },
  { name: 'Auto', value: 200 },
];
const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/80 backdrop-blur-sm p-2 border border-slate-600 rounded-lg">
          {/* Apply the fix for percent formatting */}
          <p className="font-bold text-white">{`${payload[0].name}: ${payload[0].value} (${payload[0].percent ? payload[0].percent.toFixed(0) : '0'}%)`}</p>
        </div>
      );
    }
    return null;
  };

export default function SectorAllocationChart() {
  return (
    <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
            <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
            >
                {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Tooltip content={<CustomTooltip/>}/>
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
}
