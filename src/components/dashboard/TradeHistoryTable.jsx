import React, { useState, useEffect } from "react";
import { Trade } from "@/api/entities";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Bot,
  User as UserIcon,
  Download,
  Settings,
  Cpu,
  Unplug
} from "lucide-react";
import { format } from 'date-fns';

const initialColumns = {
  date: { label: 'Date & Time', visible: true },
  symbol: { label: 'Symbol', visible: true },
  source: { label: 'Source', visible: true },
  side: { label: 'Side', visible: true },
  quantity: { label: 'Quantity', visible: true },
  price: { label: 'Price', visible: true },
  status: { label: 'Status', visible: true },
  pnl: { label: 'P&L', visible: true },
};

export default function TradeHistoryTable() {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(initialColumns);

  useEffect(() => {
    loadTradeHistory();
  }, []);

  useEffect(() => {
    filterTrades();
  }, [trades, searchTerm, statusFilter, sideFilter, sourceFilter]);

  const loadTradeHistory = async () => {
    setIsLoading(true);
    try {
      // Using dummy data as per previous implementation until backend is live
      const dummyTrades = [
        { id: 1, created_date: new Date().toISOString(), symbol: 'RELIANCE', exchange: 'NSE', side: 'BUY', quantity: 50, price: 2450.75, status: 'EXECUTED', pnl: 1727.5, trade_source: 'AI_STRATEGY', source_details: 'MomentumBoost', confidence_score: 85, strategy: 'MomentumBoost' },
        { id: 2, created_date: new Date().toISOString(), symbol: 'INFY', exchange: 'NSE', side: 'BUY', quantity: 75, price: 1750, status: 'EXECUTED', pnl: -1830, trade_source: 'USER_MANUAL', source_details: 'Jagrut', strategy: 'Manual' },
        { id: 3, created_date: new Date().toISOString(), symbol: 'TCS', exchange: 'NSE', side: 'BUY', quantity: 25, price: 3650.25, status: 'EXECUTED', pnl: 1313.75, trade_source: 'AI_STRATEGY', source_details: 'MeanReversion', confidence_score: 91, strategy: 'MeanReversion' },
        { id: 4, created_date: new Date().toISOString(), symbol: 'WIPRO', exchange: 'NSE', side: 'BUY', quantity: 100, price: 425.75, status: 'PENDING', pnl: 0, trade_source: 'ALGORITHM', source_details: 'RSI-Reversal V2', strategy: 'RSI-Reversal V2' },
        { id: 5, created_date: new Date().toISOString(), symbol: 'HDFC', exchange: 'NSE', side: 'SELL', quantity: 30, price: 1580.5, status: 'EXECUTED', pnl: 2240, trade_source: 'API', source_details: 'Zerodha Webhook', strategy: 'API Trigger' },
      ];
      setTrades(dummyTrades);
    } catch (error) {
      console.error("Failed to load trade history:", error);
    }
    setIsLoading(false);
  };

  const filterTrades = () => {
    let tempTrades = [...trades];
    if (searchTerm) {
      tempTrades = tempTrades.filter(trade =>
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      tempTrades = tempTrades.filter(trade => trade.status === statusFilter);
    }
    if (sideFilter !== 'all') {
      tempTrades = tempTrades.filter(trade => trade.side === sideFilter);
    }
    if (sourceFilter !== 'all') {
      tempTrades = tempTrades.filter(trade => trade.trade_source === sourceFilter);
    }
    setFilteredTrades(tempTrades);
  };

  const exportToCSV = () => {
    const headers = Object.keys(visibleColumns).filter(key => visibleColumns[key].visible).map(key => visibleColumns[key].label);
    const rows = filteredTrades.map(trade => {
      return Object.keys(visibleColumns).filter(key => visibleColumns[key].visible).map(key => {
        switch (key) {
          case 'date': return format(new Date(trade.created_date), 'MMM dd, yyyy HH:mm');
          case 'symbol': return `${trade.symbol} ${trade.exchange}`;
          case 'source': return `${trade.trade_source}: ${trade.source_details}`;
          case 'pnl': return trade.pnl?.toFixed(2);
          default: return trade[key];
        }
      });
    });

    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trade_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const toggleColumnVisibility = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: { ...prev[key], visible: !prev[key].visible } }));
  };
  
  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const TradeSource = ({ source, details }) => {
    const iconMap = {
      AI_STRATEGY: <Bot className="w-4 h-4 text-amber-400" />,
      USER_MANUAL: <UserIcon className="w-4 h-4 text-blue-400" />,
      ALGORITHM: <Cpu className="w-4 h-4 text-purple-400" />,
      API: <Unplug className="w-4 h-4 text-gray-400" />,
      UNKNOWN: <UserIcon className="w-4 h-4 text-gray-500" />
    };
    const textMap = {
      AI_STRATEGY: `AI: ${details}`,
      USER_MANUAL: `User: ${details}`,
      ALGORITHM: `Algo: ${details}`,
      API: `API: ${details}`,
      UNKNOWN: 'Manual Trade'
    };
    return (
      <div className="flex items-center gap-2">
        {iconMap[source] || iconMap['UNKNOWN']}
        <span className="font-medium">{textMap[source] || textMap['UNKNOWN']}</span>
      </div>
    );
  };

  const TradeRow = ({ trade }) => {
    const isExpanded = expandedRow === trade.id;
    return (
      <>
        <TableRow onClick={() => toggleRow(trade.id)} className="cursor-pointer hover:bg-slate-800/60 border-b-slate-700">
          {visibleColumns.date.visible && <TableCell>{format(new Date(trade.created_date), 'MMM dd, yyyy HH:mm')}</TableCell>}
          {visibleColumns.symbol.visible && <TableCell>
            <div className="font-bold">{trade.symbol}</div>
            <div className="text-xs text-slate-400">{trade.exchange}</div>
          </TableCell>}
          {visibleColumns.source.visible && <TableCell><TradeSource source={trade.trade_source} details={trade.source_details} /></TableCell>}
          {visibleColumns.side.visible && <TableCell>
            <Badge className={trade.side === 'BUY' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>{trade.side}</Badge>
          </TableCell>}
          {visibleColumns.quantity.visible && <TableCell>{trade.quantity}</TableCell>}
          {visibleColumns.price.visible && <TableCell>₹{trade.price.toFixed(2)}</TableCell>}
          {visibleColumns.status.visible && <TableCell>
            <Badge variant={trade.status === 'EXECUTED' ? 'default' : 'secondary'}>{trade.status}</Badge>
          </TableCell>}
          {visibleColumns.pnl.visible && <TableCell className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
            {trade.pnl !== 0 ? (trade.pnl > 0 ? '+' : '-') : ''}₹{Math.abs(trade.pnl).toFixed(2)}
          </TableCell>}
        </TableRow>
        {isExpanded && (
          <TableRow className="bg-slate-800">
            <TableCell colSpan={Object.values(visibleColumns).filter(c => c.visible).length}>
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><strong>Confidence:</strong> <Badge variant="outline">{trade.confidence_score || 'N/A'}%</Badge></div>
                <div><strong>Strategy:</strong> {trade.strategy || 'N/A'}</div>
                <div><strong>Order ID:</strong> {trade.broker_order_id || 'N/A'}</div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Trade History</h2>
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="Search symbol..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px] bg-slate-700 border-slate-600"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="EXECUTED">Executed</SelectItem><SelectItem value="PENDING">Pending</SelectItem></SelectContent>
          </Select>
          <Select value={sideFilter} onValueChange={setSideFilter}>
            <SelectTrigger className="w-full md:w-[120px] bg-slate-700 border-slate-600"><SelectValue placeholder="Side" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Sides</SelectItem><SelectItem value="BUY">Buy</SelectItem><SelectItem value="SELL">Sell</SelectItem></SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
             <SelectTrigger className="w-full md:w-[150px] bg-slate-700 border-slate-600"><SelectValue placeholder="Source" /></SelectTrigger>
             <SelectContent><SelectItem value="all">All Sources</SelectItem><SelectItem value="AI_STRATEGY">AI Strategy</SelectItem><SelectItem value="USER_MANUAL">Manual</SelectItem><SelectItem value="ALGORITHM">Algorithm</SelectItem><SelectItem value="API">API</SelectItem></SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600"><Settings className="w-4 h-4 mr-2" /> View</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(visibleColumns).map(([key, { label, visible }]) => (
                <DropdownMenuCheckboxItem key={key} checked={visible} onCheckedChange={() => toggleColumnVisibility(key)}>{label}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={exportToCSV} className="bg-slate-700 border-slate-600 hover:bg-slate-600"><Download className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>
      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-slate-700">
                {Object.entries(visibleColumns).map(([key, {label, visible}]) => visible && <TableHead key={key} className="text-slate-300">{label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={Object.values(visibleColumns).filter(c => c.visible).length} className="text-center h-24">Loading trade history...</TableCell></TableRow>
              ) : filteredTrades.length > 0 ? (
                filteredTrades.map(trade => <TradeRow key={trade.id} trade={trade} />)
              ) : (
                <TableRow><TableCell colSpan={Object.values(visibleColumns).filter(c => c.visible).length} className="text-center h-24">No trades found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}