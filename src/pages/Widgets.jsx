
import React from 'react';
import PinnableWidget from '../components/dashboard/PinnableWidget';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Info, Pin } from 'lucide-react';

// Import all widgets
import PortfolioAnalytics from '../components/portfolio/PortfolioAnalytics';
import TradeHistoryTable from '../components/dashboard/TradeHistoryTable';
import AIRecommendationsPanel from '../components/portfolio/AIRecommendationsPanel';
import PerformanceComparisonTool from '../components/portfolio/PerformanceComparisonTool';
import StrategyAttributionView from '../components/portfolio/StrategyAttributionView';

// Only show widgets that are NOT in the fixed section
const availableWidgets = [
  {
    id: 'portfolio-analytics',
    title: 'Portfolio Analytics',
    description: 'Advanced charts and performance metrics with customizable timeframes',
    component: PortfolioAnalytics,
    widget_type: 'PortfolioAnalytics',
    category: 'Analytics',
    defaultProps: {},
    defaultLayout: { w: 8, h: 6 }
  },
  {
    id: 'trade-history',
    title: 'Trade History Table',
    description: 'Comprehensive table of your trading history with advanced filters and export options',
    component: TradeHistoryTable,
    widget_type: 'TradeHistoryTable',
    category: 'Trading',
    defaultProps: {},
    defaultLayout: { w: 12, h: 8 }
  },
  {
    id: 'ai-recommendations',
    title: 'AI Recommendations',
    description: 'Smart trading suggestions powered by our AI engine with confidence scores',
    component: AIRecommendationsPanel,
    widget_type: 'AIRecommendationsPanel',
    category: 'AI Insights',
    defaultProps: {},
    defaultLayout: { w: 4, h: 6 }
  },
  {
    id: 'performance-comparison',
    title: 'Performance Comparison',
    description: 'Compare your portfolio performance against market benchmarks and indices',
    component: PerformanceComparisonTool,
    widget_type: 'PerformanceComparisonTool',
    category: 'Analytics',
    defaultProps: {},
    defaultLayout: { w: 8, h: 6 }
  },
  {
    id: 'strategy-attribution',
    title: 'Strategy Attribution',
    description: 'Detailed breakdown of performance by individual trading strategies',
    component: StrategyAttributionView,
    widget_type: 'StrategyAttributionView',
    category: 'Strategy Analysis',
    defaultProps: {},
    defaultLayout: { w: 12, h: 8 }
  }
];

export default function WidgetsPage() {
  const categories = [...new Set(availableWidgets.map(w => w.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 flex items-center gap-3">
            <Package className="text-amber-400" />
            Widgets
          </h1>
          <p className="text-slate-400 text-lg mb-4">
            Browse and pin widgets to customize your dashboard. Essential widgets are already included by default.
          </p>
          
          {/* Info Card */}
          <Card className="bg-blue-900/20 border-blue-500/30 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-300">
                <Info className="w-5 h-5" />
                How Widget Pinning Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-blue-400" />
                <span>Click "Pin to Dashboard" to add widgets to your customizable section</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 text-xs">Fixed</Badge>
                <span>Essential widgets (Portfolio Summary, Trading Status, Recent Activity) are always visible</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span>Pinned widgets appear in the "My Custom Widgets" section of your dashboard</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Widget Categories */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
              {category}
              <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-600">
                {availableWidgets.filter(w => w.category === category).length} widgets
              </Badge>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableWidgets
                .filter(widget => widget.category === category)
                .map(widget => (
                  <div key={widget.id} className="h-[500px]">
                    <PinnableWidget
                      widgetType={widget.widget_type}
                      defaultProps={widget.defaultProps}
                      defaultLayout={widget.defaultLayout}
                      showTitle={true}
                      title={widget.title}
                    >
                      <div className="h-full">
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                              {widget.category}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-sm">{widget.description}</p>
                        </div>
                        <div className="h-[350px] bg-slate-900/50 rounded-lg p-3 overflow-hidden">
                          <widget.component {...widget.defaultProps} isDashboardWidget={true} />
                        </div>
                      </div>
                    </PinnableWidget>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Empty State for No Widgets */}
        {availableWidgets.length === 0 && (
          <div className="text-center py-20 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700">
            <Package className="mx-auto h-16 w-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Additional Widgets Available</h3>
            <p className="text-slate-400">All available widgets are already included in your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}
