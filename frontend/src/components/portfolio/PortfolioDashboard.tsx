import React from 'react';
import { usePortfolioData, usePortfolioPerformance } from '../../hooks/usePortfolioData';
import { useAppSelector } from '../../store';
import { selectPortfolioSummary, selectTopHoldings } from '../../store/portfolio/portfolioSelectors';
import { PortfolioSummaryCard } from './PortfolioSummaryCard';
import { MetricCard } from './MetricCard';
import { DashboardSkeleton } from './PortfolioSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { PercentageChange } from './PercentageChange';

const PortfolioDashboard: React.FC = () => {
  const userId = 'current-user'; // From auth context
  const { data: portfolio, isLoading } = usePortfolioData(userId);
  const { data: performance } = usePortfolioPerformance(userId, '1D');
  const portfolioSummary = useAppSelector(selectPortfolioSummary);
  const topHoldings = useAppSelector(selectTopHoldings);

  if (isLoading && !portfolio) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PortfolioSummaryCard portfolio={portfolio} loading={isLoading} />
        
        <MetricCard
          title="Holdings"
          value={portfolio?.holdings.length || 0}
          subtitle="Active positions"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          loading={isLoading}
        />
        
        <MetricCard
          title="Cash Balance"
          value={portfolio?.cashBalance || 0}
          subtitle="Available for trading"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          loading={isLoading}
        />
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {performance ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {portfolio?.dayChangePercent.toFixed(2)}%
                  </div>
                  <PercentageChange
                    value={portfolio?.dayChange || 0}
                    percentage={portfolio?.dayChangePercent || 0}
                    showCurrency
                    size="lg"
                  />
                </div>
                <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-gray-500">Chart placeholder</span>
                </div>
              </div>
            ) : (
              <div className="h-40 bg-gray-100 rounded animate-pulse"></div>
            )}
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card>
          <CardHeader>
            <CardTitle>Top Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topHoldings.slice(0, 5).map((holding) => (
                <div key={holding.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        {holding.symbol.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{holding.symbol}</div>
                      <div className="text-sm text-gray-500">{holding.allocation.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${holding.marketValue.toLocaleString()}
                    </div>
                    <PercentageChange
                      value={holding.dayChange}
                      percentage={holding.dayChangePercent}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {portfolio?.recentActivities?.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{activity.description}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <PercentageChange
                    value={activity.impact}
                    percentage={activity.impactPercent}
                    showCurrency
                    size="sm"
                  />
                </div>
              </div>
            )) || (
              <div className="text-center text-gray-500 py-8">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDashboard;