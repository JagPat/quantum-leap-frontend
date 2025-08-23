import React from 'react';
import { PortfolioData } from '../../types/portfolio';
import { UpdateIndicator, MarketStatusBadge, RealTimeToggle } from './UpdateIndicator';
import { useRealTimePortfolio } from '../../hooks/useRealTimePortfolio';
import { useAppSelector } from '../../store';
import { selectCurrentPortfolio } from '../../store/portfolio/portfolioSelectors';
import { cn } from '../../utils/cn';

interface PortfolioHeaderProps {
  portfolio?: PortfolioData | null;
  className?: string;
}

export const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({
  portfolio,
  className,
}) => {
  const currentPortfolio = useAppSelector(selectCurrentPortfolio);
  const effectivePortfolio = portfolio || currentPortfolio;
  
  // Assuming we have user ID from auth context
  const userId = 'current-user'; // This should come from auth context
  const { isEnabled, enable, disable } = useRealTimePortfolio({ userId });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn('bg-white border-b border-gray-200 px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        {/* Left side - Title and breadcrumb */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">Dashboard</span>
              <span className="text-gray-300">•</span>
              <MarketStatusBadge />
            </div>
          </div>
          
          {effectivePortfolio && (
            <div className="hidden md:flex items-center space-x-6 ml-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(effectivePortfolio.totalValue)}
                </div>
                <div className="text-xs text-gray-500">Total Value</div>
              </div>
              
              <div className="text-center">
                <div className={cn(
                  'text-lg font-semibold',
                  {
                    'text-green-600': effectivePortfolio.dayChange > 0,
                    'text-red-600': effectivePortfolio.dayChange < 0,
                    'text-gray-600': effectivePortfolio.dayChange === 0,
                  }
                )}>
                  {effectivePortfolio.dayChange > 0 ? '+' : ''}
                  {formatCurrency(effectivePortfolio.dayChange)}
                </div>
                <div className="text-xs text-gray-500">Today</div>
              </div>
              
              <div className="text-center">
                <div className={cn(
                  'text-lg font-semibold',
                  {
                    'text-green-600': effectivePortfolio.totalReturn > 0,
                    'text-red-600': effectivePortfolio.totalReturn < 0,
                    'text-gray-600': effectivePortfolio.totalReturn === 0,
                  }
                )}>
                  {effectivePortfolio.totalReturn > 0 ? '+' : ''}
                  {effectivePortfolio.totalReturnPercent.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">Total Return</div>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center space-x-4">
          <UpdateIndicator showDetails />
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Real-time</span>
            <RealTimeToggle
              enabled={isEnabled}
              onToggle={(enabled) => enabled ? enable() : disable()}
            />
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {/* Mobile summary */}
      {effectivePortfolio && (
        <div className="md:hidden mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(effectivePortfolio.totalValue)}
            </div>
            <div className="text-xs text-gray-500">Total Value</div>
          </div>
          
          <div className="text-center">
            <div className={cn(
              'text-lg font-semibold',
              {
                'text-green-600': effectivePortfolio.dayChange > 0,
                'text-red-600': effectivePortfolio.dayChange < 0,
                'text-gray-600': effectivePortfolio.dayChange === 0,
              }
            )}>
              {effectivePortfolio.dayChange > 0 ? '+' : ''}
              {formatCurrency(effectivePortfolio.dayChange)}
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          
          <div className="text-center">
            <div className={cn(
              'text-lg font-semibold',
              {
                'text-green-600': effectivePortfolio.totalReturn > 0,
                'text-red-600': effectivePortfolio.totalReturn < 0,
                'text-gray-600': effectivePortfolio.totalReturn === 0,
              }
            )}>
              {effectivePortfolio.totalReturn > 0 ? '+' : ''}
              {effectivePortfolio.totalReturnPercent.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">Total Return</div>
          </div>
        </div>
      )}
    </div>
  );
};