import React, { useState, useEffect, Suspense } from 'react';
import { portfolioAPI } from '@/api/functions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowUp,
  ArrowDown,
  Wallet,
  Target,
  Activity,
  Shield,
  Loader2,
  Brain
} from "lucide-react";

// Lazy load AI Co-Pilot component to improve initial page load
const PortfolioCoPilotPanel = React.lazy(() => import('@/components/ai/PortfolioCoPilotPanel'));

// Loading component for AI Co-Pilot
const AICoPilotLoading = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <div className="flex items-center space-x-2">
      <Brain className="h-6 w-6 animate-pulse text-amber-500" />
      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
    </div>
    <div className="text-center">
      <p className="text-slate-300 text-lg font-medium">Loading AI Co-Pilot...</p>
      <p className="text-slate-500 text-sm mt-1">Analyzing your portfolio...</p>
    </div>
  </div>
);

export default function PortfolioNew() {
    const [portfolioData, setPortfolioData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('pnl');
    const [sortOrder, setSortOrder] = useState('desc');
    const [hideSmallPositions, setHideSmallPositions] = useState(false);
    const [isMockData, setIsMockData] = useState(false);

    useEffect(() => {
        fetchPortfolioData();
    }, []);

    // Debug effect to track portfolioData changes
    useEffect(() => {
        console.log("🔄 [PortfolioNew] portfolioData state changed:", {
            portfolioData: !!portfolioData,
            keys: portfolioData ? Object.keys(portfolioData) : null,
            holdingsLength: portfolioData?.holdings?.length || 0,
            positionsLength: portfolioData?.positions?.length || 0,
            summary: portfolioData?.summary
        });
    }, [portfolioData]);

    const fetchPortfolioData = async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) setRefreshing(true);
        else setLoading(true);
        setError(null);
        
        try {
            // Get authenticated broker user_id
            const brokerConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
            const activeBrokerConfig = brokerConfigs.find(config => config.is_connected && config.access_token);
            
            console.log("🔍 [PortfolioNew] BrokerConfigs:", brokerConfigs);
            console.log("🔍 [PortfolioNew] ActiveBrokerConfig:", activeBrokerConfig);
            
            if (!activeBrokerConfig?.user_data?.user_id) {
                console.log("⚠️ [PortfolioNew] No authenticated broker found - showing mock data");
                // Show mock data instead of throwing error
                const mockData = {
                    total_value: 125000.00,
                    day_pnl: 7262.50,
                    total_pnl: 15250.00,
                    holdings: [
                        {
                            tradingsymbol: "RELIANCE-EQ",
                            exchange: "NSE",
                            isin: "INE002A01018",
                            quantity: 100,
                            t1_quantity: 0,
                            average_price: 2450.50,
                            last_price: 2480.75,
                            pnl: 3025.00,
                            product: "CNC",
                            current_value: 248075.00
                        },
                        {
                            tradingsymbol: "TCS-EQ",
                            exchange: "NSE", 
                            isin: "INE467B01029",
                            quantity: 50,
                            t1_quantity: 0,
                            average_price: 3850.25,
                            last_price: 3920.50,
                            pnl: 3512.50,
                            product: "CNC",
                            current_value: 196025.00
                        },
                        {
                            tradingsymbol: "INFY-EQ",
                            exchange: "NSE",
                            isin: "INE009A01021",
                            quantity: 200,
                            t1_quantity: 0,
                            average_price: 1450.00,
                            last_price: 1520.25,
                            pnl: 14050.00,
                            product: "CNC",
                            current_value: 304050.00
                        }
                    ],
                    positions: [
                        {
                            tradingsymbol: "NIFTY25JUL5200CE",
                            exchange: "NFO",
                            product: "NRML",
                            quantity: 1,
                            average_price: 45.50,
                            last_price: 52.75,
                            pnl: 725.00,
                            net_quantity: 1,
                            current_value: 5275.00
                        },
                        {
                            tradingsymbol: "BANKNIFTY25JUL48000PE",
                            exchange: "NFO",
                            product: "NRML",
                            quantity: 2,
                            average_price: 125.00,
                            last_price: 98.50,
                            pnl: -5300.00,
                            net_quantity: 2,
                            current_value: 19700.00
                        }
                    ]
                };
                setPortfolioData(mockData);
                setIsMockData(true);
                return;
            }

            const userIdentifier = activeBrokerConfig.user_data.user_id;
            console.log("🔍 [PortfolioNew] Fetching data for user:", userIdentifier);
            
            const result = await portfolioAPI(userIdentifier);
            console.log("📊 [PortfolioNew] Complete API result:", result);
            
            if (result?.status === 'success' && result?.data) {
                console.log("✅ [PortfolioNew] Data received - Status: success");
                console.log("📊 [PortfolioNew] Data structure:", {
                    summary: result.data.summary,
                    holdings_count: result.data.holdings?.length || 0,
                    positions_count: result.data.positions?.length || 0,
                    holdings_sample: result.data.holdings?.slice(0, 2),
                    positions_sample: result.data.positions?.slice(0, 2)
                });
                
                // Check if data arrays are empty but API call was successful
                if ((!result.data.holdings || result.data.holdings.length === 0) && 
                    (!result.data.positions || result.data.positions.length === 0)) {
                    console.log("⚠️ [PortfolioNew] Portfolio data is empty - this could be normal if no holdings/positions exist");
                    console.log("💡 [PortfolioNew] Suggestion: Check broker connection or try refreshing live data");
                }
                
                setPortfolioData(result.data);
                setIsMockData(false);
                console.log("✅ [PortfolioNew] Data loaded successfully - State should be updated");
            } else {
                console.warn("⚠️ [PortfolioNew] API result not successful - showing mock data:", {
                    status: result?.status,
                    hasData: !!result?.data,
                    message: result?.message,
                    fullResult: result
                });
                // Show mock data instead of error
                const mockData = {
                    total_value: 125000.00,
                    day_pnl: 7262.50,
                    total_pnl: 15250.00,
                    holdings: [
                        {
                            tradingsymbol: "RELIANCE-EQ",
                            exchange: "NSE",
                            isin: "INE002A01018",
                            quantity: 100,
                            t1_quantity: 0,
                            average_price: 2450.50,
                            last_price: 2480.75,
                            pnl: 3025.00,
                            product: "CNC",
                            current_value: 248075.00
                        },
                        {
                            tradingsymbol: "TCS-EQ",
                            exchange: "NSE", 
                            isin: "INE467B01029",
                            quantity: 50,
                            t1_quantity: 0,
                            average_price: 3850.25,
                            last_price: 3920.50,
                            pnl: 3512.50,
                            product: "CNC",
                            current_value: 196025.00
                        }
                    ],
                    positions: [
                        {
                            tradingsymbol: "NIFTY25JUL5200CE",
                            exchange: "NFO",
                            product: "NRML",
                            quantity: 1,
                            average_price: 45.50,
                            last_price: 52.75,
                            pnl: 725.00,
                            net_quantity: 1,
                            current_value: 5275.00
                        }
                    ]
                };
                setPortfolioData(mockData);
                setIsMockData(true);
            }
        } catch (err) {
            console.error("❌ [PortfolioNew] Error fetching portfolio data - showing mock data:", err);
                            // Show mock data instead of error
                const mockData = {
                    total_value: 125000.00,
                    day_pnl: 7262.50,
                    total_pnl: 15250.00,
                holdings: [
                    {
                        tradingsymbol: "RELIANCE-EQ",
                        exchange: "NSE",
                        isin: "INE002A01018",
                        quantity: 100,
                        t1_quantity: 0,
                        average_price: 2450.50,
                        last_price: 2480.75,
                        pnl: 3025.00,
                        product: "CNC",
                        current_value: 248075.00
                    },
                    {
                        tradingsymbol: "TCS-EQ",
                        exchange: "NSE", 
                        isin: "INE467B01029",
                        quantity: 50,
                        t1_quantity: 0,
                        average_price: 3850.25,
                        last_price: 3920.50,
                        pnl: 3512.50,
                        product: "CNC",
                        current_value: 196025.00
                    }
                ],
                positions: [
                    {
                        tradingsymbol: "NIFTY25JUL5200CE",
                        exchange: "NFO",
                        product: "NRML",
                        quantity: 1,
                        average_price: 45.50,
                        last_price: 52.75,
                        pnl: 725.00,
                        net_quantity: 1,
                        current_value: 5275.00
                    }
                ]
            };
            setPortfolioData(mockData);
            setIsMockData(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    const formatPercentage = (value) => {
        const num = parseFloat(value) || 0;
        const sign = num >= 0 ? '+' : '';
        return `${sign}${num.toFixed(2)}%`;
    };

    const getChangeColor = (value) => {
        const num = parseFloat(value) || 0;
        if (num > 0) return 'text-green-600';
        if (num < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getChangeBgColor = (value) => {
        const num = parseFloat(value) || 0;
        if (num > 0) return 'bg-green-50 border-green-200';
        if (num < 0) return 'bg-red-50 border-red-200';
        return 'bg-gray-50 border-gray-200';
    };

    const getAllPositions = () => {
        if (!portfolioData) return [];
        
        const holdings = portfolioData.holdings || [];
        const positions = portfolioData.positions || [];
        
        // Combine and mark source
        const allPositions = [
            ...holdings.map(h => ({ ...h, source: 'holdings' })),
            ...positions.map(p => ({ ...p, source: 'positions' }))
        ];

        // Filter and sort
        let filtered = allPositions;

        if (searchTerm) {
            filtered = filtered.filter(pos => 
                pos.tradingsymbol?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (hideSmallPositions) {
            filtered = filtered.filter(pos => 
                Math.abs(pos.current_value || 0) > 1000
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[sortBy] || 0;
            let bVal = b[sortBy] || 0;
            
            if (sortBy === 'tradingsymbol') {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
            
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    };

    const getTopPerformers = (limit = 5) => {
        const positions = getAllPositions();
        return positions
            .filter(p => (p.pnl || 0) > 0)
            .sort((a, b) => (b.pnl || 0) - (a.pnl || 0))
            .slice(0, limit);
    };

    const getTopLosers = (limit = 5) => {
        const positions = getAllPositions();
        return positions
            .filter(p => (p.pnl || 0) < 0)
            .sort((a, b) => (a.pnl || 0) - (b.pnl || 0))
            .slice(0, limit);
    };

    // Calculate summary values from actual portfolio data
    const calculateSummary = () => {
        if (!portfolioData) return {};
        
        const allPositions = getAllPositions();
        
        console.log("🔢 [PortfolioNew] Calculating summary from positions:", {
            positionsCount: allPositions.length,
            samplePositions: allPositions.slice(0, 3).map(p => ({
                symbol: p.tradingsymbol,
                source: p.source,
                current_value: p.current_value,
                pnl: p.pnl,
                day_change: p.day_change,
                m2m: p.m2m,
                avg_price: p.average_price,
                quantity: p.quantity,
                allFields: Object.keys(p)
            }))
        });
        
        // Use backend-calculated values if available, otherwise calculate from positions
        // Check both root level and summary object for backend values
        const backendTotalValue = portfolioData.total_value || portfolioData.summary?.total_value;
        const backendTotalPnl = portfolioData.total_pnl || portfolioData.summary?.total_pnl;
        const backendDayPnl = portfolioData.day_pnl || portfolioData.summary?.day_pnl;
        
        console.log("🔍 [PortfolioNew] Backend values extracted:", {
            backendTotalValue,
            backendTotalPnl,
            backendDayPnl,
            rootLevel: {
                total_value: portfolioData.total_value,
                total_pnl: portfolioData.total_pnl,
                day_pnl: portfolioData.day_pnl
            },
            summaryLevel: portfolioData.summary
        });
        
        console.log("🔍 [PortfolioNew] Sample holdings data:", {
            firstHolding: portfolioData.holdings?.[0],
            holdingsCount: portfolioData.holdings?.length,
            sampleFields: portfolioData.holdings?.[0] ? Object.keys(portfolioData.holdings[0]) : []
        });
        
        console.log("🔢 [PortfolioNew] Backend summary values:", {
            total_value: backendTotalValue,
            total_pnl: backendTotalPnl,
            day_pnl: backendDayPnl
        });
        
        // PRINCIPLE: Use broker-calculated values FIRST, calculate only as last resort
        // Backend aggregates broker data, so use it directly
        let finalCurrentValue = backendTotalValue;
        let finalTotalPnl = backendTotalPnl;
        let finalDayPnl = backendDayPnl;
        let totalInvestment = 0;
        
        // Only calculate if backend values are missing (should rarely happen)
        if (finalCurrentValue === undefined || finalTotalPnl === undefined || finalDayPnl === undefined) {
            console.warn("⚠️ [PortfolioNew] Backend values missing, falling back to local calculation");
            
            // Fallback calculations (only when backend fails)
            const totalCurrentValue = allPositions.reduce((sum, pos) => sum + (pos.current_value || 0), 0);
            const totalPnl = allPositions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
            const dayPnl = allPositions.reduce((sum, pos) => {
                if (pos.source === 'holdings') {
                    return sum + (pos.day_change || 0); // Use broker day_change
                } else if (pos.source === 'positions') {
                    return sum + (pos.m2m || 0); // Use broker m2m
                }
                return sum + (pos.day_change || 0);
            }, 0);
            
            finalCurrentValue = finalCurrentValue ?? totalCurrentValue;
            finalTotalPnl = finalTotalPnl ?? totalPnl;
            finalDayPnl = finalDayPnl ?? dayPnl;
        }
        
        // Calculate investment total (only for percentage calculations)
        totalInvestment = allPositions.reduce((sum, pos) => {
            const avgPrice = pos.average_price || 0; // Broker-provided
            const quantity = pos.quantity || 0; // Broker-provided
            return sum + (avgPrice * quantity);
        }, 0);
        
        // Calculate percentages
        const totalPnlPercentage = totalInvestment > 0 ? (finalTotalPnl / totalInvestment) * 100 : 0;
        const dayPnlPercentage = finalCurrentValue > 0 ? (finalDayPnl / finalCurrentValue) * 100 : 0;
        
        const calculatedSummary = {
            current_value: finalCurrentValue,
            total_investment: totalInvestment,
            total_pnl: finalTotalPnl,
            total_pnl_percentage: totalPnlPercentage,
            day_pnl: finalDayPnl,
            day_pnl_percentage: dayPnlPercentage,
            holdings_count: portfolioData.holdings?.length || 0,
            positions_count: portfolioData.positions?.length || 0
        };
        
        console.log("📊 [PortfolioNew] Final calculated summary:", calculatedSummary);
        
        return calculatedSummary;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Portfolio</h3>
                    <p className="text-gray-600">Fetching your latest portfolio data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="max-w-lg mx-auto mt-20">
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-800">
                            <strong>Portfolio Error:</strong> {error}
                        </AlertDescription>
                    </Alert>
                    <div className="mt-6 text-center">
                        <Button 
                            onClick={() => fetchPortfolioData()} 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!portfolioData || (!portfolioData.holdings?.length && !portfolioData.positions?.length)) {
        console.log("🚨 [PortfolioNew] Rendering 'No Portfolio Data' because:", {
            portfolioData: !!portfolioData,
            portfolioDataKeys: portfolioData ? Object.keys(portfolioData) : null,
            holdingsLength: portfolioData?.holdings?.length || 0,
            positionsLength: portfolioData?.positions?.length || 0,
            holdingsSample: portfolioData?.holdings?.slice(0, 2),
            positionsSample: portfolioData?.positions?.slice(0, 2)
        });
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="max-w-lg mx-auto mt-20 text-center">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Portfolio Data</h3>
                        <p className="text-gray-600 mb-6">
                            {portfolioData ? 
                                "Your portfolio appears to be empty. This could be normal if you have no current holdings or positions." :
                                "Unable to load portfolio data. Please check your broker connection."}
                        </p>
                        
                        <div className="space-y-3">
                            <Button 
                                onClick={() => fetchPortfolioData()} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Portfolio
                            </Button>
                            
                            {portfolioData && (
                                <p className="text-sm text-gray-500">
                                    API Connection: ✅ Connected | Data: Empty
                                </p>
                            )}
                            
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => window.location.href = '/broker-integration'}
                            >
                                Check Broker Connection
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const allPositions = getAllPositions();
    const summary = calculateSummary();
    const topPerformers = getTopPerformers();
    const topLosers = getTopLosers();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {isMockData && (
                        <Alert className="mb-4 border-amber-200 bg-amber-50">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                <strong>Demo Mode:</strong> Showing sample portfolio data. Connect your broker to view live data from your actual portfolio.
                            </AlertDescription>
                        </Alert>
                    )}
                    {!isMockData && (
                        <Alert className="mb-4 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                <strong>Live Data:</strong> Connected to your broker. Data is current as of the last refresh.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-gray-900">Portfolio Overview</h1>
                                {!isMockData && (
                                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Live Data
                                    </Badge>
                                )}
                            </div>
                            <p className="text-gray-600 mt-1">Track your investments and performance</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Button
                                onClick={() => fetchPortfolioData(true)}
                                disabled={refreshing}
                                variant="outline"
                                className="border-blue-300 hover:bg-blue-100 hover:border-blue-400 text-blue-700 font-medium shadow-sm"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white shadow-lg border-0 rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Wallet className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Current Value</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(summary.current_value)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Invested: {formatCurrency(summary.total_investment)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0 rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className={`p-2 rounded-lg ${summary.total_pnl >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {summary.total_pnl >= 0 ? 
                                        <TrendingUp className="h-6 w-6 text-green-600" /> : 
                                        <TrendingDown className="h-6 w-6 text-red-600" />
                                    }
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Total P&L</p>
                                    <p className={`text-2xl font-bold ${getChangeColor(summary.total_pnl)}`}>
                                        {formatCurrency(summary.total_pnl)}
                                    </p>
                                    <p className={`text-xs mt-1 ${getChangeColor(summary.total_pnl)}`}>
                                        {formatPercentage(summary.total_pnl_percentage)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0 rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className={`p-2 rounded-lg ${summary.day_pnl >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <Activity className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Today's P&L</p>
                                    <p className={`text-2xl font-bold ${getChangeColor(summary.day_pnl)}`}>
                                        {formatCurrency(summary.day_pnl)}
                                    </p>
                                    <p className={`text-xs mt-1 ${getChangeColor(summary.day_pnl)}`}>
                                        {formatPercentage(summary.day_pnl_percentage)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-lg border-0 rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Target className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Total Positions</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {allPositions.length}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {portfolioData.holdings?.length || 0} Holdings, {portfolioData.positions?.length || 0} Positions
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 bg-white rounded-xl shadow-sm p-1">
                        <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="holdings" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            All Holdings
                        </TabsTrigger>
                        <TabsTrigger value="performers" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            Top Performers
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger value="copilot" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            <Shield className="w-4 h-4 mr-1" />
                            AI Co-Pilot
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Performers */}
                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center text-green-700">
                                        <TrendingUp className="w-5 h-5 mr-2" />
                                        Top Performers
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {topPerformers.length > 0 ? topPerformers.map((position, index) => (
                                            <div key={`${position.tradingsymbol}-${index}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{position.tradingsymbol}</p>
                                                    <p className="text-sm text-gray-600">{position.quantity} shares</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600">{formatCurrency(position.pnl)}</p>
                                                    <p className="text-sm text-green-600">
                                                        {formatPercentage(position.pnl_percentage)}
                                                    </p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-gray-500 text-center py-4">No profitable positions</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Losers */}
                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center text-red-700">
                                        <TrendingDown className="w-5 h-5 mr-2" />
                                        Needs Attention
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {topLosers.length > 0 ? topLosers.map((position, index) => (
                                            <div key={`${position.tradingsymbol}-${index}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{position.tradingsymbol}</p>
                                                    <p className="text-sm text-gray-600">{position.quantity} shares</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-red-600">{formatCurrency(position.pnl)}</p>
                                                    <p className="text-sm text-red-600">
                                                        {formatPercentage(position.pnl_percentage)}
                                                    </p>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-gray-500 text-center py-4">No losing positions</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Holdings Tab */}
                    <TabsContent value="holdings" className="space-y-6">
                        <Card className="bg-white shadow-lg border-0 rounded-xl">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle>All Holdings ({allPositions.length})</CardTitle>
                                    <div className="flex items-center space-x-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search stocks..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHideSmallPositions(!hideSmallPositions)}
                                            className={hideSmallPositions ? 'bg-blue-50 border-blue-300' : ''}
                                        >
                                            {hideSmallPositions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-gray-50" 
                                                    onClick={() => {
                                                        if (sortBy === 'tradingsymbol') {
                                                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                        } else {
                                                            setSortBy('tradingsymbol');
                                                            setSortOrder('asc');
                                                        }
                                                    }}
                                                >
                                                    Stock {sortBy === 'tradingsymbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                </TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-right">Avg Cost</TableHead>
                                                <TableHead className="text-right">LTP</TableHead>
                                                <TableHead className="text-right">Current Value</TableHead>
                                                <TableHead 
                                                    className="text-right cursor-pointer hover:bg-gray-50"
                                                    onClick={() => {
                                                        if (sortBy === 'pnl') {
                                                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                        } else {
                                                            setSortBy('pnl');
                                                            setSortOrder('desc');
                                                        }
                                                    }}
                                                >
                                                    P&L {sortBy === 'pnl' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                </TableHead>
                                                <TableHead className="text-right">Day Change</TableHead>
                                                <TableHead className="text-center">Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allPositions.map((position, index) => (
                                                <TableRow key={`${position.tradingsymbol}-${index}`} className="hover:bg-gray-50">
                                                    <TableCell className="font-semibold">
                                                        {position.tradingsymbol}
                                                        <div className="text-xs text-gray-500">{position.exchange}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{position.quantity?.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(position.average_price)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(position.last_price)}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(position.current_value)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className={`font-semibold ${getChangeColor(position.pnl)}`}>
                                                            {formatCurrency(position.pnl)}
                                                        </div>
                                                        <div className={`text-xs ${getChangeColor(position.pnl)}`}>
                                                            {formatPercentage(position.pnl_percentage)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className={`font-semibold ${getChangeColor(position.day_change)}`}>
                                                            {formatCurrency(position.day_change)}
                                                        </div>
                                                        <div className={`text-xs ${getChangeColor(position.day_change_percentage)}`}>
                                                            {formatPercentage(position.day_change_percentage)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge 
                                                            variant={position.source === 'holdings' ? 'default' : 'secondary'}
                                                            className="text-xs"
                                                        >
                                                            {position.source === 'holdings' ? 'Long' : 'Position'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Performers Tab */}
                    <TabsContent value="performers" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader>
                                    <CardTitle className="text-green-700">🏆 Best Performers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {topPerformers.map((position, index) => (
                                            <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-lg">{position.tradingsymbol}</h4>
                                                    <Badge className="bg-green-100 text-green-800">#{index + 1}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Quantity</p>
                                                        <p className="font-semibold">{position.quantity?.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Current Value</p>
                                                        <p className="font-semibold">{formatCurrency(position.current_value)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">P&L</p>
                                                        <p className="font-bold text-green-600">{formatCurrency(position.pnl)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Return %</p>
                                                        <p className="font-bold text-green-600">{formatPercentage(position.pnl_percentage)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader>
                                    <CardTitle className="text-red-700">⚠️ Underperformers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {topLosers.map((position, index) => (
                                            <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-lg">{position.tradingsymbol}</h4>
                                                    <Badge variant="destructive">Loss</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Quantity</p>
                                                        <p className="font-semibold">{position.quantity?.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Current Value</p>
                                                        <p className="font-semibold">{formatCurrency(position.current_value)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">P&L</p>
                                                        <p className="font-bold text-red-600">{formatCurrency(position.pnl)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Loss %</p>
                                                        <p className="font-bold text-red-600">{formatPercentage(position.pnl_percentage)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader>
                                    <CardTitle>Portfolio Allocation</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {allPositions.slice(0, 8).map((position, index) => {
                                            const percentage = ((position.current_value || 0) / (summary.current_value || 1)) * 100;
                                            return (
                                                <div key={index} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-medium">{position.tradingsymbol}</span>
                                                        <span className="text-gray-600">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                    <Progress value={percentage} className="h-2" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader>
                                    <CardTitle>Performance Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="border-b pb-3">
                                        <p className="text-sm text-gray-600">Total Invested</p>
                                        <p className="text-xl font-bold">{formatCurrency(summary.total_investment)}</p>
                                    </div>
                                    <div className="border-b pb-3">
                                        <p className="text-sm text-gray-600">Current Value</p>
                                        <p className="text-xl font-bold">{formatCurrency(summary.current_value)}</p>
                                    </div>
                                    <div className="border-b pb-3">
                                        <p className="text-sm text-gray-600">Absolute Return</p>
                                        <p className={`text-xl font-bold ${getChangeColor(summary.total_pnl)}`}>
                                            {formatCurrency(summary.total_pnl)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Return %</p>
                                        <p className={`text-xl font-bold ${getChangeColor(summary.total_pnl)}`}>
                                            {formatPercentage((summary.total_pnl / summary.total_investment) * 100)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-lg border-0 rounded-xl">
                                <CardHeader>
                                    <CardTitle>Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                        <Download className="w-4 h-4 mr-2" />
                                        Export to Excel
                                    </Button>
                                    <Button variant="outline" className="w-full">
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        View Charts
                                    </Button>
                                    <Button variant="outline" className="w-full">
                                        <PieChart className="w-4 h-4 mr-2" />
                                        Sector Analysis
                                    </Button>
                                    <Button variant="outline" className="w-full">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Sync Data
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* AI Co-Pilot Tab */}
                    <TabsContent value="copilot" className="space-y-6">
                        <Suspense fallback={<AICoPilotLoading />}>
                            <PortfolioCoPilotPanel 
                                portfolioData={portfolioData}
                                onRefresh={fetchPortfolioData}
                            />
                        </Suspense>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 