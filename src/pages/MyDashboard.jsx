import React, { useState, useEffect, useCallback } from 'react';
import { DashboardWidget } from '@/api/entities';
import WidgetWrapper from '../components/dashboard/WidgetWrapper';
import { toast } from "sonner";
import { PlusCircle, Settings, LayoutGrid, Grid3X3, Save, Info, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Import all possible widgets
import PortfolioAnalytics from '../components/portfolio/PortfolioAnalytics';
import TradeHistoryTable from '../components/dashboard/TradeHistoryTable';
import AIRecommendationsPanel from '../components/portfolio/AIRecommendationsPanel';
import PerformanceComparisonTool from '../components/portfolio/PerformanceComparisonTool';
import StrategyAttributionView from '../components/portfolio/StrategyAttributionView';
import PortfolioSummaryCards from '../components/portfolio/PortfolioSummaryCards';
import TradingStatus from '../components/dashboard/TradingStatus';
import RecentTrades from '../components/dashboard/RecentTrades';

// Map string type to actual component
const widgetMap = {
  PortfolioAnalytics,
  TradeHistoryTable,
  AIRecommendationsPanel,
  PerformanceComparisonTool,
  StrategyAttributionView,
  PortfolioSummaryCards,
  TradingStatus,
  RecentTrades
};

// Fixed widgets that are always shown (non-removable)
const FIXED_WIDGETS = [
  {
    id: 'fixed-portfolio-summary',
    widget_type: 'PortfolioSummaryCards',
    title: 'Portfolio Summary',
    props_config: {
      summary: {
        total_value: 346255,
        total_pnl: 21250,
        total_pnl_percent: 6.5,
        todays_pnl: 1211,
        todays_pnl_percent: 0.35,
      }
    }
  },
  {
    id: 'fixed-trading-status',
    widget_type: 'TradingStatus',
    title: 'Trading Engine Status',
    props_config: {
      isEngineRunning: true,
      activeStrategies: ['RSI Momentum', 'MACD Crossover', 'AI Strategy 4'],
      lastSignal: { type: 'BUY', symbol: 'RELIANCE', confidence: 85, time: '2m ago' },
      tradingMode: 'sandbox'
    }
  },
  {
    id: 'fixed-recent-trades',
    widget_type: 'RecentTrades',
    title: 'Recent Activity',
    props_config: {
      trades: [
        { id: 1, created_date: new Date().toISOString(), symbol: 'RELIANCE', side: 'BUY', quantity: 10, price: 2850, pnl: 1500 },
        { id: 2, created_date: new Date().toISOString(), symbol: 'TCS', side: 'SELL', quantity: 20, price: 3800, pnl: -800 },
        { id: 3, created_date: new Date().toISOString(), symbol: 'INFY', side: 'BUY', quantity: 15, price: 1550, pnl: 2250 },
      ]
    }
  }
];

// Available widget types for customizable section (excludes fixed widgets)
const CUSTOMIZABLE_WIDGET_TYPES = Object.keys(widgetMap).filter(type => 
  !FIXED_WIDGETS.some(fixed => fixed.widget_type === type)
);

const MAX_CUSTOMIZABLE_WIDGETS = 8;

export default function MyDashboardPage() {
  const [customizableWidgets, setCustomizableWidgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  useEffect(() => {
    loadCustomizableWidgets();
  }, []);

  const loadCustomizableWidgets = async () => {
    setIsLoading(true);
    try {
      const userWidgets = await DashboardWidget.list('-created_date');
      setCustomizableWidgets(userWidgets);
    } catch (error) {
      toast.error("Failed to load your dashboard layout.");
    }
    setIsLoading(false);
  };

  const onRemoveWidget = async (widgetId) => {
    try {
      await DashboardWidget.delete(widgetId);
      setCustomizableWidgets(prev => prev.filter(w => w.id !== widgetId));
      toast.success("Widget removed from dashboard.");
    } catch (error) {
      toast.error("Failed to remove widget.");
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(customizableWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCustomizableWidgets(items);
    toast.success("Widget moved!");
  };

  const calculateGridStyle = (widget) => {
    const { x, y, w, h } = widget.layout_config || { x: 0, y: 0, w: 6, h: 4 };
    return {
      gridColumn: `${x + 1} / ${x + w + 1}`,
      gridRow: `${y + 1} / ${y + h + 1}`,
    };
  };

  // Calculate widget statistics
  const currentCustomWidgetCount = customizableWidgets.length;
  const remainingSlots = MAX_CUSTOMIZABLE_WIDGETS - currentCustomWidgetCount;
  const totalAvailableTypes = CUSTOMIZABLE_WIDGET_TYPES.length;
  const usedWidgetTypes = new Set(customizableWidgets.map(w => w.widget_type)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white flex items-center gap-3">
              <LayoutGrid className="text-amber-400" />
              📊 My Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Essential insights above, customize below</p>
            
            <div className="flex gap-3 mt-3">
              <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-600">
                <Info className="w-3 h-3 mr-1" />
                {currentCustomWidgetCount}/{MAX_CUSTOMIZABLE_WIDGETS} Custom Widgets
              </Badge>
              <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-600">
                {remainingSlots} Slots Available
              </Badge>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center space-x-2">
              <Switch
                id="grid-helper"
                checked={showGrid}
                onCheckedChange={setShowGrid}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
              <Label htmlFor="grid-helper" className="text-slate-300 text-sm">
                <Grid3X3 className="w-4 h-4 inline mr-1" />
                Grid
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-save"
                checked={autoSaveEnabled}
                onCheckedChange={setAutoSaveEnabled}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
              <Label htmlFor="auto-save" className="text-slate-300 text-sm">Auto-save</Label>
            </div>
            <Button 
              variant={isEditMode ? "default" : "outline"}
              onClick={() => setIsEditMode(!isEditMode)}
              className={isEditMode ? "bg-green-600 hover:bg-green-700" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
            >
              <Settings className="w-4 h-4 mr-2" />
              {isEditMode ? 'Done Editing' : 'Edit Layout'}
            </Button>
          </div>
        </div>
        
        {/* Fixed Essential Widgets Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">Essential Insights</h2>
            <Badge className="bg-blue-100 text-blue-800">Always Visible</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Portfolio Summary - Full Width */}
            <div className="lg:col-span-12">
              <WidgetWrapper 
                title="Portfolio Summary" 
                isFixed={true}
                isEditMode={false}
              >
                <PortfolioSummaryCards {...FIXED_WIDGETS[0].props_config} />
              </WidgetWrapper>
            </div>
            
            {/* Trading Status */}
            <div className="lg:col-span-4">
              <WidgetWrapper 
                title="Trading Engine Status" 
                isFixed={true}
                isEditMode={false}
              >
                <TradingStatus {...FIXED_WIDGETS[1].props_config} />
              </WidgetWrapper>
            </div>
            
            {/* Recent Activity */}
            <div className="lg:col-span-8">
              <WidgetWrapper 
                title="Recent Activity" 
                isFixed={true}
                isEditMode={false}
              >
                <RecentTrades {...FIXED_WIDGETS[2].props_config} />
              </WidgetWrapper>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
          <span className="text-slate-400 text-sm">Customizable Section</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
        </div>

        {/* Customizable Widgets Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">My Custom Widgets</h2>
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              onClick={() => window.location.href = '/Widgets'}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Widgets
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
              <p className="text-slate-300">Loading your custom widgets...</p>
            </div>
          </div>
        ) : customizableWidgets.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700">
            <PlusCircle className="mx-auto h-16 w-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Custom Widgets Yet</h3>
            <p className="text-slate-400 mb-6">Browse available widgets and pin the ones you want to see here.</p>
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              onClick={() => window.location.href = '/Widgets'}
            >
              Browse Widgets
            </Button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="customizable-widgets">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6"
                >
                  {customizableWidgets.map((widget, index) => {
                    const widgetKeys = Object.keys(widgetMap);
                    const matchingKey = widgetKeys.find(key => 
                      key.toLowerCase() === (widget.widget_type || '').toLowerCase()
                    );
                    const WidgetComponent = widgetMap[matchingKey];
                    
                    return (
                      <Draggable key={widget.id.toString()} draggableId={widget.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`lg:col-span-6 transition-all duration-200 ${snapshot.isDragging ? 'z-50 scale-105 shadow-2xl' : ''}`}
                          >
                            <WidgetWrapper 
                              title={matchingKey ? matchingKey.replace(/([A-Z])/g, ' $1').trim() : "Unknown Widget"} 
                              onRemove={() => onRemoveWidget(widget.id)}
                              isEditMode={isEditMode}
                              dragHandleProps={provided.dragHandleProps}
                              isDragging={snapshot.isDragging}
                              isFixed={false}
                            >
                              {WidgetComponent ? (
                                <WidgetComponent {...widget.props_config} isDashboardWidget={true} />
                              ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                  <div className="text-center">
                                    <p>Unknown Widget Type</p>
                                    <p className="text-xs mt-1">{widget.widget_type}</p>
                                  </div>
                                </div>
                              )}
                            </WidgetWrapper>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}