import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    percentage: number;
    period?: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  loading = false,
  className,
  variant = 'default',
}) => {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return '';
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      // Check if it's a currency value
      if (val > 1000 || val < -1000) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      }
      // Check if it's a percentage
      if (val < 1 && val > -1 && val !== 0) {
        return `${(val * 100).toFixed(2)}%`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const renderChange = () => {
    if (!change) return null;

    const isPositive = change.value > 0;
    const isNegative = change.value < 0;

    return (
      <div className="flex items-center space-x-1 text-sm">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            {
              'text-green-700 bg-green-100': isPositive,
              'text-red-700 bg-red-100': isNegative,
              'text-gray-700 bg-gray-100': !isPositive && !isNegative,
            }
          )}
        >
          {isPositive && '+'}
          {change.percentage.toFixed(2)}%
        </span>
        {change.period && (
          <span className="text-gray-500 text-xs">{change.period}</span>
        )}
      </div>
    );
  };

  return (
    <Card className={cn(getVariantClasses(), className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
          <span>{title}</span>
          {icon && <span className="text-gray-400">{icon}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </div>
          
          {subtitle && (
            <div className="text-sm text-gray-500">{subtitle}</div>
          )}
          
          {renderChange()}
        </div>
      </CardContent>
    </Card>
  );
};