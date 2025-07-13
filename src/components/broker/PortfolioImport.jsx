
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Bot,
  AlertTriangle,
  Info,
  Code,
  Clock
} from "lucide-react";
import BackendConnectionHelper from './BackendConnectionHelper';
import { useToast } from "@/components/ui/use-toast";

export default function PortfolioImport({ onImportComplete, fetchLivePortfolio, portfolio }) {
  const { toast } = useToast();
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const portfolioData = (portfolio?.holdings || []).concat(portfolio?.positions || []);

  const handleSelectPosition = (index, checked) => {
    const newSelected = new Set(selectedPositions);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedPositions(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPositions(new Set(portfolioData.map((_, index) => index)));
    } else {
      setSelectedPositions(new Set());
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);

    const selectedData = portfolioData.filter((_, index) => selectedPositions.has(index));

    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      onImportComplete(selectedData);
    } catch (error) {
      console.error('Error importing portfolio:', error);
    }

    setIsImporting(false);
  };

  const calculateTotals = () => {
    const selectedData = portfolioData.filter((_, index) => selectedPositions.has(index));
    return selectedData.reduce((totals, position) => ({
      invested: totals.invested + position.invested_amount,
      current: totals.current + position.current_value,
      pnl: totals.pnl + position.pnl
    }), { invested: 0, current: 0, pnl: 0 });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <BackendConnectionHelper />

      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Live Portfolio Import
            </span>
            <Button
              variant="outline"
              onClick={fetchLivePortfolio}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Fetch Live Data
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                Fetching Live Data...
              </h3>
              <p className="text-sm text-slate-500">
                Please wait while we connect to your broker.
              </p>
            </div>
          ) : !portfolio ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                No Portfolio Data
              </h3>
              <p className="text-sm text-slate-500">
                Click "Fetch Live Data" to import from your broker.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Checkbox
                    checked={selectedPositions.size === portfolioData.length && portfolioData.length > 0}
                    onCheckedChange={handleSelectAll}
                    id="select-all"
                    className="mr-2"
                  />
                  <label htmlFor="select-all">Select All ({selectedPositions.size} / {portfolioData.length})</label>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={selectedPositions.size === 0 || isImporting}
                >
                  {isImporting ? "Importing..." : `Import ${selectedPositions.size} Positions`}
                </Button>
              </div>

              {isImporting && <Progress value={importProgress} className="mb-4" />}

              <div className="overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Qty.</TableHead>
                      <TableHead>Avg. Cost</TableHead>
                      <TableHead>LTP</TableHead>
                      <TableHead>Current Val.</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Net Chg.</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolioData.map((position, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPositions.has(index)}
                            onCheckedChange={(checked) => handleSelectPosition(index, checked)}
                          />
                        </TableCell>
                        <TableCell>{position.tradingsymbol}</TableCell>
                        <TableCell>{position.quantity}</TableCell>
                        <TableCell>{position.average_price?.toFixed(2)}</TableCell>
                        <TableCell>{position.last_price?.toFixed(2)}</TableCell>
                        <TableCell>{(position.quantity * position.last_price)?.toFixed(2)}</TableCell>
                        <TableCell className={position.pnl > 0 ? "text-green-500" : "text-red-500"}>
                          {position.pnl?.toFixed(2)}
                        </TableCell>
                        <TableCell className={position.change > 0 ? "text-green-500" : "text-red-500"}>
                          {position.change?.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={position.source === 'holdings' ? 'secondary' : 'outline'}>
                            {position.source === 'holdings' ? 'Holding' : 'Position'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Import Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Total Invested</p>
                    <p className="text-lg font-bold">₹{totals.invested.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Current Value</p>
                    <p className="text-lg font-bold">₹{totals.current.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Overall P&L</p>
                    <p className={`text-lg font-bold ${totals.pnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{totals.pnl.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
