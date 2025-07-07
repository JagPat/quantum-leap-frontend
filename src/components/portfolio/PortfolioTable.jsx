import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PnlCell = ({ value }) => {
    const isPositive = value >= 0;
    return (
        <span className={`flex items-center font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {formatCurrency(value)}
        </span>
    );
};

export default function PortfolioTable({ holdings = [], positions = [] }) {
  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
          <TabsTrigger value="holdings">Holdings ({holdings.length})</TabsTrigger>
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="holdings" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Symbol</TableHead>
                <TableHead className="text-slate-300 text-right">Quantity</TableHead>
                <TableHead className="text-slate-300 text-right">Avg. Cost</TableHead>
                <TableHead className="text-slate-300 text-right">LTP</TableHead>
                <TableHead className="text-slate-300 text-right">P&L</TableHead>
                <TableHead className="text-slate-300 text-right">Day's Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((holding) => (
                <TableRow key={holding.instrument_token} className="border-b-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-white">{holding.tradingsymbol}</TableCell>
                  <TableCell className="text-right text-white">{holding.quantity}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(holding.average_price)}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(holding.last_price)}</TableCell>
                  <TableCell className="text-right"><PnlCell value={holding.pnl} /></TableCell>
                  <TableCell className="text-right">
                     <span className={holding.day_change >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(holding.day_change)} ({holding.day_change_percentage?.toFixed(2)}%)
                     </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
           <Table>
            <TableHeader>
              <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-300">Symbol</TableHead>
                <TableHead className="text-slate-300 text-right">Quantity</TableHead>
                <TableHead className="text-slate-300 text-right">Avg. Cost</TableHead>
                <TableHead className="text-slate-300 text-right">LTP</TableHead>
                <TableHead className="text-slate-300 text-right">P&L</TableHead>
                <TableHead className="text-slate-300 text-right">Day's Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.instrument_token} className="border-b-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-white">{position.tradingsymbol}</TableCell>
                  <TableCell className="text-right text-white">{position.quantity}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(position.average_price)}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(position.last_price)}</TableCell>
                  <TableCell className="text-right"><PnlCell value={position.pnl} /></TableCell>
                  <TableCell className="text-right">
                     <span className={position.day_change >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(position.day_change)}
                     </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}