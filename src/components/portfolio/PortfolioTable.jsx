import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp, Settings, EyeOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

const initialColumns = {
  symbol: { label: 'Instrument', visible: true, sortable: true },
  quantity: { label: 'Quantity', visible: true, sortable: true },
  avg_price: { label: 'Avg. Buy Price', visible: true, sortable: true },
  current_price: { label: 'Current Price', visible: true, sortable: true },
  unrealized_pnl: { label: 'Unrealized P&L', visible: true, sortable: true },
  entry_date: { label: 'Entry Date', visible: true, sortable: true },
  ai_target_price: { label: 'AI Target Price', visible: false, sortable: true },
  ai_action: { label: 'AI Action', visible: true, sortable: true },
  confidence_score: { label: 'Confidence %', visible: true, sortable: true },
  strategy: { label: 'Strategy', visible: true, sortable: true },
};

export default function PortfolioTable({ holdings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'unrealized_pnl', direction: 'descending' });
  const [visibleColumns, setVisibleColumns] = useState(initialColumns);

  const sortedHoldings = React.useMemo(() => {
    let sortableItems = [...holdings];
    if (sortConfig.key && sortConfig.direction) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [holdings, sortConfig]);

  const filteredHoldings = sortedHoldings.filter(holding =>
    Object.values(holding).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const toggleColumnVisibility = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: { ...prev[key], visible: !prev[key].visible } }));
  };

  const SortableHeader = ({ tkey, label, className }) => {
    const isSorted = sortConfig.key === tkey;
    const SortIcon = sortConfig.direction === 'ascending' ? ChevronUp : ChevronDown;
    return (
      <TableHead className={className} onClick={() => requestSort(tkey)}>
        <div className="flex items-center gap-1 cursor-pointer">
          {label}
          {isSorted && <SortIcon className="w-4 h-4" />}
        </div>
      </TableHead>
    );
  };
  
  const AIActionBadge = ({ action }) => {
    const actionStyles = {
      BUY: 'bg-green-500/20 text-green-300 border-green-500/30',
      SELL: 'bg-red-500/20 text-red-300 border-red-500/30',
      HOLD: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
    return <Badge className={`font-semibold ${actionStyles[action] || ''}`}>{action}</Badge>;
  };

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-lg p-0">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search holdings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
              <Settings className="w-4 h-4 mr-2" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-white">
            {Object.entries(visibleColumns).map(([key, { label, visible }]) => (
              <DropdownMenuCheckboxItem key={key} checked={visible} onCheckedChange={() => toggleColumnVisibility(key)}>
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b-slate-700">
            {Object.entries(visibleColumns).map(([key, { label, visible, sortable }]) => 
              visible && (sortable ? 
                <SortableHeader key={key} tkey={key} label={label} /> : 
                <TableHead key={key}>{label}</TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredHoldings.map((holding) => (
            <TableRow key={holding.id} className="border-b-slate-700/50 hover:bg-slate-800">
              {visibleColumns.symbol.visible && <TableCell><div className="font-bold">{holding.symbol}</div></TableCell>}
              {visibleColumns.quantity.visible && <TableCell>{holding.quantity}</TableCell>}
              {visibleColumns.avg_price.visible && <TableCell>₹{holding.avg_price.toFixed(2)}</TableCell>}
              {visibleColumns.current_price.visible && <TableCell>₹{holding.current_price.toFixed(2)}</TableCell>}
              {visibleColumns.unrealized_pnl.visible && <TableCell className={holding.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                <div>{holding.unrealized_pnl >= 0 ? '+' : '-'}₹{Math.abs(holding.unrealized_pnl).toFixed(2)}</div>
                <div className="text-xs">({holding.pnl_percent.toFixed(2)}%)</div>
              </TableCell>}
              {visibleColumns.entry_date.visible && <TableCell>{format(new Date(holding.entry_date), 'dd MMM yyyy')}</TableCell>}
              {visibleColumns.ai_target_price.visible && <TableCell>₹{holding.ai_target_price?.toFixed(2) || 'N/A'}</TableCell>}
              {visibleColumns.ai_action.visible && <TableCell><AIActionBadge action={holding.ai_action} /></TableCell>}
              {visibleColumns.confidence_score.visible && <TableCell>{holding.confidence_score}%</TableCell>}
              {visibleColumns.strategy.visible && <TableCell><Badge variant="outline" className="bg-slate-700 text-slate-300">{holding.strategy}</Badge></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}