import React from 'react';
import { useConnectionHealth, useMarketStatus } from '../../hooks/useRealTimePortfolio';
import { cn } from '../../utils/cn';

interface UpdateIndicatorProps {
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({
  className,
  showDetails = false,
  size = 'md',
}) => {
  const { status, color, isConnected, lastUpdate, consecutiveErrors } = useConnectionHealth();
  const { isOpen, formattedTimeUntilEvent } = useMarketStatus();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return isOpen ? 'Live updates active' : 'Connected (market closed)';
      case 'unstable':
        return `Connection issues (${consecutiveErrors} errors)`;
      case 'disconnected':
        return 'Updates paused';
      default:
        return 'Unknown status';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  if (!showDetails) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div
          className={cn(
            'rounded-full animate-pulse',
            getSizeClasses(),
            getColorClasses(),
            {
              'animate-pulse': status === 'unstable',
              'animate-none': status === 'connected',
            }
          )}
          title={getStatusText()}
        />
        {size !== 'sm' && (
          <span className="text-xs text-gray-500">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-3 text-sm', className)}>
      <div className="flex items-center space-x-2">
        <div
          className={cn(
            'rounded-full',
            getSizeClasses(),
            getColorClasses(),
            {
              'animate-pulse': status === 'unstable',
            }
          )}
        />
        <span className="text-gray-700">{getStatusText()}</span>
      </div>
      
      <div className="text-gray-500 text-xs">
        <div>Last update: {formatLastUpdate()}</div>
        {!isOpen && (
          <div className="text-blue-600">{formattedTimeUntilEvent}</div>
        )}
      </div>
    </div>
  );
};

interface MarketStatusBadgeProps {
  className?: string;
}

export const MarketStatusBadge: React.FC<MarketStatusBadgeProps> = ({ className }) => {
  const { isOpen, formattedTimeUntilEvent } = useMarketStatus();

  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        {
          'bg-green-100 text-green-800': isOpen,
          'bg-gray-100 text-gray-800': !isOpen,
        },
        className
      )}
    >
      <div
        className={cn('w-2 h-2 rounded-full mr-2', {
          'bg-green-500': isOpen,
          'bg-gray-400': !isOpen,
        })}
      />
      <span>{isOpen ? 'Market Open' : 'Market Closed'}</span>
      {!isOpen && (
        <span className="ml-1 text-gray-600">• {formattedTimeUntilEvent}</span>
      )}
    </div>
  );
};

interface RealTimeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const RealTimeToggle: React.FC<RealTimeToggleProps> = ({
  enabled,
  onToggle,
  className,
  disabled = false,
}) => {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        {
          'bg-blue-600': enabled,
          'bg-gray-200': !enabled,
          'opacity-50 cursor-not-allowed': disabled,
        },
        className
      )}
    >
      <span className="sr-only">Enable real-time updates</span>
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          {
            'translate-x-6': enabled,
            'translate-x-1': !enabled,
          }
        )}
      />
    </button>
  );
};

interface DataFreshnessIndicatorProps {
  lastUpdated: string | null;
  className?: string;
  threshold?: number; // Minutes after which data is considered stale
}

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  lastUpdated,
  className,
  threshold = 5,
}) => {
  if (!lastUpdated) {
    return (
      <span className={cn('text-xs text-gray-500', className)}>
        No data
      </span>
    );
  }

  const now = new Date();
  const updated = new Date(lastUpdated);
  const ageInMinutes = (now.getTime() - updated.getTime()) / (1000 * 60);
  
  const isStale = ageInMinutes > threshold;
  const isFresh = ageInMinutes < 1;

  const getAgeText = () => {
    if (isFresh) return 'Just now';
    if (ageInMinutes < 60) return `${Math.floor(ageInMinutes)}m ago`;
    const hours = Math.floor(ageInMinutes / 60);
    return `${hours}h ago`;
  };

  return (
    <span
      className={cn(
        'text-xs',
        {
          'text-green-600': isFresh,
          'text-gray-600': !isFresh && !isStale,
          'text-red-600': isStale,
        },
        className
      )}
    >
      {getAgeText()}
      {isStale && ' (stale)'}
    </span>
  );
};