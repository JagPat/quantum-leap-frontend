import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { PercentageChange } from './PercentageChange';
import { PortfolioData } from '../../types/portfolio';
import { cn } from '../../utils/cn';

interface PortfolioSummaryCardProps {
  portfolio: PortfolioData | null;
  loading?: boolean;
  className?: string;
}

export const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  portfolio,
  loading = false,
  className,
}) => {
  if (loading || !portfolio) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="h-6 bg-gray-200 rounded w-32"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-40"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-28"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">
          Portfolio Value
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(portfolio.totalValue)}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Today:</span>
              <PercentageChange
                value={portfolio.dayChange}
                percentage={portfolio.dayChangePercent}
                showCurrency
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600">Total Return:</span>
              <PercentageChange
                value={portfolio.totalReturn}
                percentage={portfolio.totalReturnPercent}
                showCurrency
              />
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Cash Balance:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(portfolio.cashBalance)}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Last updated: {new Date(portfolio.lastUpdated).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};