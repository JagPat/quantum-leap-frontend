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
                const user = await User.me();
                if (!user || !user.email) {
                    throw new Error("Could not identify the current user. Please log in again.");
                }

                const { data, error: apiError } = await portfolioAPI({ user_id: user.email });

                if (apiError || (data && data.status === 'error')) {
                    console.error("API Error Response:", data);
                    throw new Error(apiError?.message || data.detail || 'Failed to fetch portfolio data from the backend.');
                }
                
                // Assuming the backend returns the portfolio data directly
                if(data && data.positions) {
                    setPortfolioData(data);
                } else {
                     // Handle cases where backend might wrap data, e.g. { data: { positions: [] } }
                     if(data && data.data && data.data.positions) {
                         setPortfolioData(data.data);
                     } else {
                        throw new Error("Portfolio data received from backend is not in the expected format.");
                     }
                }

            } catch (err) {
                setError(err.message);
                console.error("Error fetching portfolio:", err);
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
                                <PortfolioTable positions={portfolioData.positions} />
                            </CardContent>
                        </Card>
                        <PortfolioAnalytics positions={portfolioData.positions}/>
                    </div>
                     <div className="col-span-1 lg:col-span-2">
                        <AISummaryPanel positions={portfolioData.positions}/>
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