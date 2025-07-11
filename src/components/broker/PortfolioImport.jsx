
import React, { useState, useEffect } from 'react';
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
  Code
} from "lucide-react";
import BackendConnectionHelper from './BackendConnectionHelper';
import { brokerAPI } from '@/api/functions'; // Import the Base44 function

export default function PortfolioImport({ onImportComplete, brokerConfig }) {
  const [portfolioData, setPortfolioData] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    //
  }, [brokerConfig]);

  const fetchPortfolioData = async () => {
    setIsLoading(true);
    setPortfolioData([]);
    setSelectedPositions(new Set());
    setApiError('');

    try {
      if (!brokerConfig?.is_connected) {
        throw new Error('Broker not properly connected. Please complete the authentication process first.');
      }

      // Call the Base44 function, which will handle auth securely
      const userId = brokerConfig?.user_data?.user_id || brokerConfig?.user_id || 'local@development.com';
      
      const [holdingsResult, positionsResult] = await Promise.all([
        brokerAPI({ endpoint: 'holdings', user_id: userId }),
        brokerAPI({ endpoint: 'positions', user_id: userId })
      ]);

      const holdingsResponse = holdingsResult.data;
      const positionsResponse = positionsResult.data;

      if (!holdingsResponse || !positionsResponse) {
        throw new Error("Failed to get a valid response from the backend function.");
      }
      
      // Check for errors in the function responses
      if (holdingsResponse.detail || positionsResponse.detail) {
        const errorDetail = holdingsResponse.detail || positionsResponse.detail;
        if (errorDetail.includes('No active broker session')) {
            throw new Error('Broker session not found. Please reconnect to your broker.');
        } else if (errorDetail.includes('Session expired')) {
            throw new Error('Broker session expired. Please reconnect to your broker.');
        } else if (errorDetail.includes('Invalid JWT token')) {
            throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(errorDetail);
      }
      
      const holdings = holdingsResponse.data || holdingsResponse.holdings || [];
      const positions = positionsResponse.data?.net || positionsResponse.positions || [];

      const transformedData = [
        ...holdings.map(holding => ({
          symbol: holding.tradingsymbol,
          exchange: holding.exchange,
          quantity: holding.quantity,
          avg_price: holding.average_price,
          current_price: holding.last_price,
          invested_amount: holding.average_price * holding.quantity,
          current_value: holding.last_price * holding.quantity,
          pnl: holding.pnl,
          pnl_percent: holding.average_price !== 0 ? (holding.pnl / (holding.average_price * holding.quantity)) * 100 : 0,
          broker_instrument_token: holding.instrument_token,
          source: 'holdings'
        })),
        ...positions.filter(pos => pos.quantity !== 0).map(position => ({
          symbol: position.tradingsymbol,
          exchange: position.exchange,
          quantity: position.quantity,
          avg_price: position.average_price,
          current_price: position.last_price,
          invested_amount: Math.abs(position.average_price * position.quantity),
          current_value: Math.abs(position.last_price * position.quantity),
          pnl: position.pnl,
          pnl_percent: (position.average_price !== 0) ? (position.pnl / Math.abs(position.average_price * position.quantity)) * 100 : 0,
          broker_instrument_token: position.instrument_token,
          source: 'positions'
        }))
      ];

      setPortfolioData(transformedData);
      if (transformedData.length > 0) {
        setSelectedPositions(new Set(transformedData.map((_, index) => index)));
      }

    } catch (error) {
      console.error('Error fetching portfolio data via function:', error);
      setApiError(error.message || 'An unknown error occurred while fetching portfolio data.');
      setSelectedPositions(new Set());
    }
    setIsLoading(false);
  };

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
              onClick={fetchPortfolioData}
              disabled={isLoading || !brokerConfig?.is_connected}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Fetch Live Data
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!brokerConfig?.is_connected ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                Broker Not Connected
              </h3>
              <p className="text-sm text-slate-500">
                Please complete the broker authentication to access your live portfolio data.
              </p>
            </div>
          ) : apiError ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Failed to fetch live data
              </h3>
              <p className="text-sm text-red-500 mb-4">
                {apiError}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Ensure your broker account is connected and your session is active.
                </p>
              </div>
              <Button onClick={fetchPortfolioData} variant="outline">
                Retry Connection
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                Fetching Live Portfolio...
              </h3>
              <p className="text-sm text-slate-500">
                Connecting to your backend server and loading your real-time data...
              </p>
            </div>
          ) : portfolioData.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                Ready to Import Live Data
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Click "Fetch Live Data" to load your current Zerodha portfolio from your backend.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ Live data loaded successfully from your backend • {portfolioData.length} positions found
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Invested</span>
                    <Wallet className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    ₹{totals.invested.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Current Value</span>
                    <TrendingUp className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    ₹{totals.current.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total P&L</span>
                    {totals.pnl >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className={`text-lg font-bold mt-1 ${
                    totals.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totals.pnl >= 0 ? '+' : ''}₹{totals.pnl.toLocaleString()}
                  </div>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Importing positions...</span>
                    <span className="text-sm text-slate-500">{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={selectedPositions.size === 0 || isImporting}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Import Selected ({selectedPositions.size})
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <Bot className="w-4 h-4 mr-2" />
                  Enable AI Management
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {portfolioData.length > 0 && (
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Portfolio Holdings ({portfolioData.length})</span>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedPositions.size === portfolioData.length && portfolioData.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select All</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Invested</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioData.map((position, index) => (
                    <TableRow key={`${position.symbol}-${position.exchange}-${position.broker_instrument_token}-${position.source}`} className="hover:bg-slate-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedPositions.has(index)}
                          onCheckedChange={(checked) => handleSelectPosition(index, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <span className="font-semibold">{position.symbol}</span>
                          <div className="text-xs text-slate-500">{position.exchange}</div>
                        </div>
                      </TableCell>
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>₹{position.avg_price.toLocaleString()}</TableCell>
                      <TableCell>₹{position.current_price.toLocaleString()}</TableCell>
                      <TableCell>₹{position.invested_amount.toLocaleString()}</TableCell>
                      <TableCell>₹{position.current_value.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {position.pnl >= 0 ? '+' : ''}₹{position.pnl.toLocaleString()}
                          </span>
                          <Badge
                            variant={position.pnl_percent >= 0 ? 'default' : 'destructive'}
                            className={`text-xs ${
                              position.pnl_percent >= 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {position.pnl_percent >= 0 ? '+' : ''}{position.pnl_percent.toFixed(2)}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
