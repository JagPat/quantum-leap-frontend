import React, { useState } from 'react';
import { usePortfolioPerformance } from '../../hooks/usePortfolioData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ChartSkeleton } from './PortfolioSkeleton';
import { TimeRange } from '../../types/portfolio';

const PerformanceCharts: React.FC = () => {
  const userId = 'current-user';
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const { data: performance, isLoading, setTimeRange: updateTimeRange } = usePortfolioPerformance(userId, timeRange);

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
    { value: 'ALL', label: 'ALL' },
  ];

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    updateTimeRange(newRange);
  };

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Portfolio Performance</CardTitle>
            <div className="flex space-x-1">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleTimeRangeChange(range.value)}
                  className={`px-3 py-1 text-sm rounded ${
                    timeRange === range.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Performance Chart Placeholder</span>
          </div>
          {performance && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {performance.metrics.totalReturnPercent.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Total Return</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {performance.metrics.annualizedReturn.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Annualized</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {performance.metrics.volatility.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Volatility</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {performance.metrics.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Sharpe Ratio</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benchmark Comparison */}
      {performance?.benchmarkComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Benchmark Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {performance.metrics.totalReturnPercent.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Portfolio</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {performance.benchmarkComparison.benchmarkReturn.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">{performance.benchmarkComparison.benchmark}</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  performance.benchmarkComparison.alpha > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {performance.benchmarkComparison.alpha > 0 ? '+' : ''}
                  {performance.benchmarkComparison.alpha.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Alpha</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceCharts;