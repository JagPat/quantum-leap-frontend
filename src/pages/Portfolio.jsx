import React, { useState, useEffect, Suspense } from 'react';
import { User } from '@/api/entities';
import { portfolioAPI } from '@/api/functions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const PortfolioSummaryCards = React.lazy(() => import('../components/portfolio/PortfolioSummaryCards'));
const PortfolioTable = React.lazy(() => import('../components/portfolio/PortfolioTable'));
const PortfolioAnalytics = React.lazy(() => import('../components/portfolio/PortfolioAnalytics'));
const AISummaryPanel = React.lazy(() => import('../components/portfolio/AISummaryPanel'));

export default function Portfolio() {
    const [portfolioData, setPortfolioData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPortfolioData = async () => {
            setLoading(true);
            setError(null);
            try {
                // CRITICAL FIX: Enhanced user identification - prioritize authenticated broker user_id
                let userIdentifier = null;
                
                // First priority: Check for authenticated broker user_id
                const brokerConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
                const activeBrokerConfig = brokerConfigs.find(config => config.is_connected && config.access_token);
                
                if (activeBrokerConfig?.user_data?.user_id) {
                    userIdentifier = activeBrokerConfig.user_data.user_id;
                    console.log("🔍 [Portfolio] Using authenticated broker user_id:", userIdentifier);
                } else {
                    // Fallback: Use development user email as string
                    const user = await User.me();
                    userIdentifier = user?.email || 'local@development.com';
                    console.log("🔍 [Portfolio] No broker authentication found, using fallback email:", userIdentifier);
                }
                
                console.log("🔍 [Portfolio] Final userIdentifier:", userIdentifier, "Type:", typeof userIdentifier);
                
                // CRITICAL FIX: Pass string user ID, not user object
                const result = await portfolioAPI(userIdentifier);
                
                if (result?.data) {
                    setPortfolioData(result.data);
                } else {
                    console.warn("No portfolio data received");
                    setPortfolioData([]);
                }
            } catch (err) {
                console.error("❌ [Portfolio] Error fetching portfolio data:", err);
                setError("Failed to load portfolio data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolioData();
    }, []);

    if (loading) {
        return <PortfolioSkeleton />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error Fetching Portfolio</AlertTitle>
                    <AlertDescription>
                        {error}
                        <p className="text-xs text-muted-foreground mt-2">
                            Please ensure your trading backend is running and accessible. If the issue persists, check the function logs.
                        </p>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    if (!portfolioData) {
        return <div>No portfolio data available.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Portfolio Overview</h2>
            </div>
            <Suspense fallback={<PortfolioSkeleton />}>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
                     <div className="col-span-1 lg:col-span-5 space-y-4">
                        <PortfolioSummaryCards summary={portfolioData.summary} />
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Current Holdings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {portfolioData && Array.isArray(portfolioData.positions) ? (
                                    <PortfolioTable 
                                        positions={portfolioData.positions}
                                        holdings={portfolioData.holdings || []}
                                    />
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <p>No position data available or data is in an invalid format.</p>
                                        <p className="text-xs mt-2">Check console for API response details.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {portfolioData && Array.isArray(portfolioData.positions) &&
                            <PortfolioAnalytics positions={portfolioData.positions}/>
                        }
                    </div>
                     <div className="col-span-1 lg:col-span-2">
                        {portfolioData && Array.isArray(portfolioData.positions) &&
                            <AISummaryPanel positions={portfolioData.positions}/>
                        }
                    </div>
                </div>
            </Suspense>
        </div>
    );
}

const PortfolioSkeleton = () => (
    <div className="p-8 pt-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-1">
            <Skeleton className="h-96" />
        </div>
    </div>
);