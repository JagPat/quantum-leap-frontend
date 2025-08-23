import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { cn } from '../../utils/cn';

interface PortfolioSkeletonProps {
  variant?: 'dashboard' | 'table' | 'chart' | 'card';
  className?: string;
}

export const PortfolioSkeleton: React.FC<PortfolioSkeletonProps> = ({
  variant = 'dashboard',
  className,
}) => {
  const renderDashboardSkeleton = () => (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-gray-200 rounded w-28"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-36"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={cn('space-y-4', className)}>
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>

      {/* Table Rows */}
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-4 bg-white rounded-lg border animate-pulse"
          >
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChartSkeleton = () => (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          <div className="flex space-x-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded w-8"></div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 bg-gray-200 rounded"></div>
        <div className="mt-4 flex justify-center space-x-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCardSkeleton = () => (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader>
        <div className="h-5 bg-gray-200 rounded w-28"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-36"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </CardContent>
    </Card>
  );

  switch (variant) {
    case 'table':
      return renderTableSkeleton();
    case 'chart':
      return renderChartSkeleton();
    case 'card':
      return renderCardSkeleton();
    default:
      return renderDashboardSkeleton();
  }
};

// Specific skeleton components for different use cases
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <PortfolioSkeleton variant="dashboard" className={className} />
);

export const TableSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <PortfolioSkeleton variant="table" className={className} />
);

export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <PortfolioSkeleton variant="chart" className={className} />
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <PortfolioSkeleton variant="card" className={className} />
);