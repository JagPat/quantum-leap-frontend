
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
  Info, // Added Info icon
  Code // Added Code icon for API docs
} from "lucide-react";
import BackendConnectionHelper from './BackendConnectionHelper'; // New import

export default function PortfolioImport({ onImportComplete, brokerConfig }) {
  const [portfolioData, setPortfolioData] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [apiError, setApiError] = useState(''); // New state for API errors

  useEffect(() => {
    // This will do nothing on initial load, user must click the button
  }, [brokerConfig]);

  const fetchPortfolioData = async () => {
    setIsLoading(true);
    setPortfolioData([]); // Clear previous data
    setSelectedPositions(new Set()); // Clear selections
    setApiError(''); // Clear previous errors
    
    try {
      if (!brokerConfig?.is_connected || !brokerConfig?.access_token) {
        throw new Error('Broker not properly connected. Please complete the authentication process first.');
      }

      // Use the real Kite API service
      const { default: KiteAPIService } = await import('./KiteAPIService');
      const kiteService = new KiteAPIService(
        brokerConfig.api_key,
        brokerConfig.api_secret,
        brokerConfig.access_token
      );

      // Fetch real holdings and positions
      const [holdingsResponse, positionsResponse] = await Promise.all([
        kiteService.getHoldings(),
        kiteService.getPositions()
      ]);

      const holdings = holdingsResponse.data || []; // Assumes holdingsResponse.data is directly the array
      const positions = positionsResponse.data.net || []; // Use 'net' positions for current day's net positions

      // Transform Kite API data to our format
      const transformedData = [
        ...holdings.map(holding => ({
          symbol: holding.tradingsymbol,
          exchange: holding.exchange,
          quantity: holding.quantity,
          avg_price: holding.average_price,
          current_price: holding.last_price,
          invested_amount: holding.average_price * holding.quantity,
          current_value: holding.last_price * holding.quantity,
          pnl: holding.pnl, // Assumes pnl is provided by the simulated service
          pnl_percent: holding.average_price !== 0 ? (holding.pnl / (holding.average_price * holding.quantity)) * 100 : 0,
          broker_instrument_token: holding.instrument_token,
          source: 'holdings'
        })),
        ...positions.filter(pos => pos.quantity !== 0).map(position => ({ // Filter out zero quantity positions
          symbol: position.tradingsymbol,
          exchange: position.exchange,
          quantity: position.quantity,
          avg_price: position.average_price,
          current_price: position.last_price,
          // For positions, invested amount is absolute of avg price * quantity (can be negative for shorts)
          invested_amount: Math.abs(position.average_price * position.quantity), 
          current_value: Math.abs(position.last_price * position.quantity),
          pnl: position.pnl,
          // P&L percentage for positions can be tricky, using absolute invested amount as base
          pnl_percent: (position.average_price !== 0) ? (position.pnl / Math.abs(position.average_price * position.quantity)) * 100 : 0,
          broker_instrument_token: position.instrument_token,
          source: 'positions'
        }))
      ];

      setPortfolioData(transformedData);
      // Select all positions by default if data is successfully loaded
      setSelectedPositions(new Set(transformedData.map((_, index) => index)));
      
    } catch (error) {
      console.error('Error fetching real portfolio data:', error);
      // Display a user-friendly error message
      setApiError(`Failed to fetch live data: ${error.message}. The backend API endpoints are not yet implemented.`);
      setSelectedPositions(new Set()); // Clear selections on error
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

    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      // In a real implementation, this would:
      // 1. Create Position entities from selected data
      // 2. Set up real-time price updates
      // 3. Configure AI management flags

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
      {/* Backend Connection Status */}
      <BackendConnectionHelper />

      {/* Backend Implementation Guidance */}
      <Card className="trading-card border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Info className="w-5 h-5" />
            Backend Integration Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-amber-800">
            <p className="text-sm">
              <strong>Frontend Status:</strong> ✅ Ready and fully implemented
            </p>
            <p className="text-sm">
              <strong>Backend Status:</strong> ⏳ Waiting for API implementation
            </p>
            <p className="text-sm">
              The portfolio import functionality requires backend API endpoints to fetch live data from Kite Connect.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/api-docs', '_blank')}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <Code className="w-4 h-4 mr-2" />
              View API Specification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Import Status */}
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
                Backend Integration Required
              </h3>
              <p className="text-sm text-red-500 mb-4">
                {apiError}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Live portfolio data requires backend API integration. 
                  The frontend is ready - implement the backend endpoints to enable this feature.
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
                Connecting to Zerodha servers and loading your real-time data...
              </p>
            </div>
          ) : portfolioData.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                Ready to Import Live Data
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Click "Fetch Live Data" to load your current Zerodha portfolio.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ Live data loaded successfully from Zerodha • {portfolioData.length} positions found
                </p>
              </div>

              {/* Summary Cards */}
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

              {/* Import Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Importing positions...</span>
                    <span className="text-sm text-slate-500">{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}

              {/* Action Buttons */}
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

      {/* Portfolio Data Table */}
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
                    <TableRow key={index} className="hover:bg-slate-50">
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
