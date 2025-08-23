import React from 'react';
import { cn } from '../../utils/cn';

interface PercentageChangeProps {
  value: number;
  percentage: number;
  showCurrency?: boolean;
  showPercentage?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PercentageChange: React.FC<PercentageChangeProps> = ({
  value,
  percentage,
  showCurrency = false,
  showPercentage = true,
  className,
  size = 'md',
}) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(val));
  };

  const formatPercentage = (val: number) => {
    return `${Math.abs(val).toFixed(2)}%`;
  };

  const getColorClasses = () => {
    if (isPositive) return 'text-green-600 bg-green-50';
    if (isNegative) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5';
      case 'lg':
        return 'text-base px-3 py-1.5';
      default:
        return 'text-sm px-2 py-1';
    }
  };

  const getIcon = () => {
    if (isPositive) return '↗';
    if (isNegative) return '↘';
    return '→';
  };

  return (
    <div
      className={cn(
        'inline-flex items-center space-x-1 rounded-md font-medium',
        getColorClasses(),
        getSizeClasses(),
        className
      )}
    >
      <span className="text-xs opacity-75">{getIcon()}</span>
      
      <div className="flex items-center space-x-1">
        {showCurrency && (
          <span>
            {isNegative ? '-' : isPositive ? '+' : ''}
            {formatCurrency(value)}
          </span>
        )}
        
        {showCurrency && showPercentage && <span>•</span>}
        
        {showPercentage && (
          <span>
            {isNegative ? '-' : isPositive ? '+' : ''}
            {formatPercentage(percentage)}
          </span>
        )}
      </div>
    </div>
  );
};