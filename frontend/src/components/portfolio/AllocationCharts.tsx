import React, { useState } from 'react';
import { usePortfolioAllocation } from '../../hooks/usePortfolioData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ChartSkeleton } from './PortfolioSkeleton';

const AllocationCharts: React.FC = () => {
  const userId = 'current-user';
  const { data: allocation, isLoading } = usePortfolioAllocation(userId);
  const [viewType, setViewType] = useState<'holdings' | 'sectors' | 'assetTypes'>('holdings');

  if (isLoading) {
    return <ChartSkeleton />;
  }

  const getCurrentData = () => {
    if (!allocation) return {};
    
    switch (viewType) {
      case 'sectors':
        return allocation.bySector;
      case 'assetTypes':
        return allocation.byAssetType;
      default:
        return allocation.byHolding;
    }
  };

  const data = getCurrentData();
  const entries = Object.entries(data).sort(([,a], [,b]) => b - a);

  return (
    <div className="space-y-6">
      {/* Allocation Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Portfolio Allocation</CardTitle>
            <div className="flex space-x-1">
              <button
                onClick={() => setViewType('holdings')}
                className={`px-3 py-1 text-sm rounded ${
                  viewType === 'holdings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Holdings
              </button>
              <button
                onClick={() => setViewType('sectors')}
                className={`px-3 py-1 text-sm rounded ${
                  viewType === 'sectors'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sectors
              </button>
              <button
                onClick={() => setViewType('assetTypes')}
                className={`px-3 py-1 text-sm rounded ${
                  viewType === 'assetTypes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Asset Types
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Placeholder */}
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">Allocation Chart Placeholder</span>
            </div>
            
            {/* Allocation Table */}
            <div className="space-y-2">
              {entries.slice(0, 10).map(([name, percentage], index) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(${index * 36}, 70%, 50%)` }}
                    />
                    <span className="text-sm text-gray-900">{name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diversification Analysis */}
      {allocation && (
        <Card>
          <CardHeader>
            <CardTitle>Diversification Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Diversification Score</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${allocation.diversificationScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {allocation.diversificationScore.toFixed(0)}/100
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {Object.keys(allocation.bySector).length}
                  </div>
                  <div className="text-sm text-gray-500">Sectors</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {Object.keys(allocation.byAssetType).length}
                  </div>
                  <div className="text-sm text-gray-500">Asset Types</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {Object.keys(allocation.byHolding).length}
                  </div>
                  <div className="text-sm text-gray-500">Holdings</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AllocationCharts;