import React, { useState, useMemo } from 'react';
import { usePortfolioHoldings } from '../../hooks/usePortfolioData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { PercentageChange } from './PercentageChange';
import { TableSkeleton } from './PortfolioSkeleton';
import { Holding, HoldingFilters, SortConfig } from '../../types/portfolio';
import { portfolioUtils } from '../../utils/portfolioValidation';

const HoldingsTable: React.FC = () => {
  const userId = 'current-user';
  const { data: holdings, isLoading } = usePortfolioHoldings(userId);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'marketValue', direction: 'desc' });
  const [filters, setFilters] = useState<HoldingFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const processedHoldings = useMemo(() => {
    if (!holdings) return [];
    
    let filtered = portfolioUtils.filterHoldings(holdings, { ...filters, search: searchTerm });
    return portfolioUtils.sortHoldings(filtered, sortConfig.field as keyof Holding, sortConfig.direction);
  }, [holdings, sortConfig, filters, searchTerm]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search holdings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filters.assetType || ''}
                onChange={(e) => setFilters({ ...filters, assetType: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="stock">Stocks</option>
                <option value="etf">ETFs</option>
                <option value="bond">Bonds</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              {processedHoldings.length} of {holdings?.length || 0} holdings
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Return
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedHoldings.map((holding) => (
                  <tr key={holding.symbol} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                          <span className="text-xs font-bold text-blue-600">
                            {holding.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                          <div className="text-sm text-gray-500">{holding.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {holding.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${holding.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${holding.marketValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PercentageChange
                        value={holding.dayChange}
                        percentage={holding.dayChangePercent}
                        showCurrency
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PercentageChange
                        value={holding.unrealizedPnL}
                        percentage={holding.unrealizedPnLPercent}
                        showCurrency
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {holding.allocation.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HoldingsTable;