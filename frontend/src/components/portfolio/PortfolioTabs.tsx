import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/TabPanel';
import { cn } from '../../utils/cn';

export interface PortfolioTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface PortfolioTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: PortfolioTab[];
  children: React.ReactNode;
  className?: string;
}

export const PortfolioTabs: React.FC<PortfolioTabsProps> = ({
  activeTab,
  onTabChange,
  tabs,
  children,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <div className="border-b border-gray-200 bg-white px-6">
          <TabsList className="h-12 bg-transparent p-0 space-x-8">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className={cn(
                  'relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none',
                  'hover:text-foreground disabled:opacity-50'
                )}
              >
                <div className="flex items-center space-x-2">
                  {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1">
          {React.Children.map(children, (child, index) => {
            if (React.isValidElement(child)) {
              const tab = tabs[index];
              return (
                <TabsContent key={tab?.id || index} value={tab?.id || `tab-${index}`}>
                  {child}
                </TabsContent>
              );
            }
            return child;
          })}
        </div>
      </Tabs>
    </div>
  );
};

// Individual tab content wrapper
interface PortfolioTabContentProps {
  tabId: string;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const PortfolioTabContent: React.FC<PortfolioTabContentProps> = ({
  tabId,
  children,
  className,
  padding = true,
}) => {
  return (
    <div
      className={cn(
        'w-full',
        {
          'p-6': padding,
        },
        className
      )}
    >
      {children}
    </div>
  );
};

// Pre-defined tab configurations
export const DEFAULT_PORTFOLIO_TABS: PortfolioTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'holdings',
    label: 'Holdings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'allocation',
    label: 'Allocation',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    id: 'ai-analysis',
    label: 'AI Analysis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

// Mobile-optimized tabs
export const MOBILE_PORTFOLIO_TABS: PortfolioTab[] = [
  {
    id: 'overview',
    label: 'Overview',
  },
  {
    id: 'holdings',
    label: 'Holdings',
  },
  {
    id: 'performance',
    label: 'Charts',
  },
  {
    id: 'ai-analysis',
    label: 'AI',
  },
];