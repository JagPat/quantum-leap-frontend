
import React, { useState, useEffect, useCallback } from 'react';
import { DashboardWidget, Trade, Position, Strategy } from '@/api/entities';
import { User } from '@/api/entities'; // Added User import
import WidgetWrapper from '../components/dashboard/WidgetWrapper';
import { PlusCircle, Settings, LayoutGrid, Grid3X3, Save, Info, Package, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { portfolioAPI } from '@/api/functions';

// Lazy load heavy widgets to dramatically improve initial dashboard performance
const PortfolioAnalytics = React.lazy(() => import('../components/portfolio/PortfolioAnalytics'));
const TradeHistoryTable = React.lazy(() => import('../components/dashboard/TradeHistoryTable'));
const AIRecommendationsPanel = React.lazy(() => import('../components/portfolio/AIRecommendationsPanel'));
const PerformanceComparisonTool = React.lazy(() => import('../components/portfolio/PerformanceComparisonTool'));
const StrategyAttributionView = React.lazy(() => import('../components/portfolio/StrategyAttributionView'));

// Import lightweight widgets that can load immediately
import PortfolioSummaryCards from '../components/portfolio/PortfolioSummaryCards';
import TradingStatus from '../components/dashboard/TradingStatus';
import RecentTrades from '../components/dashboard/RecentTrades';
import AISignalsWidget from '../components/dashboard/AISignalsWidget';
import BYOAIStatusWidget from '../components/dashboard/BYOAIStatusWidget';

// Loading fallback for lazy widgets
const LoadingFallback = ({ title }) => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex items-center space-x-2">
      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
      <span className="text-slate-400">Loading {title}...</span>
    </div>
  </div>
);

// Map string type to actual component (including lazy loaded ones)
const widgetMap = {
  PortfolioAnalytics,
  TradeHistoryTable,
  AIRecommendationsPanel,
  PerformanceComparisonTool,
  StrategyAttributionView,
  PortfolioSummaryCards,
  TradingStatus,
  RecentTrades,
  AISignalsWidget,
  BYOAIStatusWidget
};

// Available widget types for customizable section (only heavy widgets)
const CUSTOMIZABLE_WIDGET_TYPES = Object.keys(widgetMap).filter(type => 
  !['PortfolioSummaryCards', 'TradingStatus', 'RecentTrades'].includes(type)
);

const MAX_CUSTOMIZABLE_WIDGETS = 8;

export default function MyDashboardPage() {
  const [customizableWidgets, setCustomizableWidgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolioData, setPortfolioData] = useState([]);
  const [trades, setTrades] = useState([]);
  const [positions, setPositions] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [deferredDataLoaded, setDeferredDataLoaded] = useState(false);
  const [fixedWidgetsProps, setFixedWidgetsProps] = useState({
      tradingStatus: { isEngineRunning: true, activeStrategies: ['RSI Momentum', 'AI Strategy 4'], lastSignal: null, tradingMode: 'sandbox' },
      recentTrades: { trades: [] }
  });

  // Enhanced progressive loading - load essential data first, defer heavy operations
  const loadData = async () => {
    setIsLoading(true);
    try {
      // PHASE 1: Load essential data first for immediate dashboard display
      let userIdentifier = null;
      
      // First priority: Check for authenticated broker user_id
      const brokerConfigs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
      const activeBrokerConfig = brokerConfigs.find(config => config.is_connected && config.access_token);
      
      if (activeBrokerConfig?.user_data?.user_id) {
        userIdentifier = activeBrokerConfig.user_data.user_id;
        console.log("🔍 [MyDashboard] Using authenticated broker user_id:", userIdentifier);
        
        // Only call portfolio API if we have a valid user
        const portfolioResponse = await portfolioAPI(userIdentifier);

        // Handle the new portfolioAPI response format
        if (portfolioResponse.status === 'no_connection') {
          console.warn("⚠️ [MyDashboard] No broker connection - showing empty portfolio");
          setError('Connect to your broker to view portfolio data');
          setPortfolioData([]);
          setPortfolioSummary(portfolioResponse.data.summary);
        } else if (portfolioResponse.status === 'error') {
          console.error("❌ [MyDashboard] Portfolio API error:", portfolioResponse.message);
          setError(`Portfolio error: ${portfolioResponse.message}`);
          setPortfolioData([]);
          setPortfolioSummary(portfolioResponse.data.summary);
        } else {
          // Successful response
          setPortfolioData(portfolioResponse?.data || []);
          setPortfolioSummary(portfolioResponse?.data?.summary || null);
          setError(''); // Clear any previous errors
        }
      } else {
        // No authenticated user found
        console.warn("⚠️ [MyDashboard] No authenticated user found - showing default state");
        setError('Please authenticate with your broker to view portfolio data');
        setPortfolioData([]);
        setPortfolioSummary({
          total_invested: 0,
          current_value: 0,
          total_pnl: 0,
          day_pnl: 0,
          total_pnl_percentage: 0,
          day_pnl_percentage: 0
        });
      }

      // Load customizable widgets from localStorage
      const savedWidgets = JSON.parse(localStorage.getItem('customizableWidgets') || '[]');
      setCustomizableWidgets(savedWidgets);
      
      setIsLoading(false); // Show dashboard immediately with essential data
      
      // PHASE 2: Defer heavy data loading to background
      setTimeout(() => {
        loadDeferredData();
      }, 100); // Small delay to let essential UI render first
      
    } catch (error) {
      console.error("❌ [MyDashboard] Error loading essential data:", error);
      setError(`Failed to load dashboard: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Deferred data loading for heavy operations
  const loadDeferredData = async () => {
    if (deferredDataLoaded) return;
    
    try {
      // Load heavy data in background without blocking UI
      const [tradesData, positionsData, strategiesData] = await Promise.allSettled([
        Trade.list().catch(() => []),
        Position.list().catch(() => []), 
        Strategy.list().catch(() => [])
      ]);

      setTrades(tradesData.status === 'fulfilled' ? tradesData.value : []);
      setPositions(positionsData.status === 'fulfilled' ? positionsData.value : []);
      setStrategies(strategiesData.status === 'fulfilled' ? strategiesData.value : []);
      
      // Update fixed widget props with real data
      setFixedWidgetsProps(prev => ({
        ...prev,
        recentTrades: { trades: tradesData.status === 'fulfilled' ? tradesData.value.slice(0, 5) : [] }
      }));
      
      setDeferredDataLoaded(true);
      console.log("✅ [MyDashboard] Deferred data loaded successfully");
    } catch (error) {
      console.error("⚠️ [MyDashboard] Error loading deferred data:", error);
      // Don't show error for deferred data - dashboard already functional
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);

  const onRemoveWidget = async (widgetId) => {
    try {
      await DashboardWidget.delete(widgetId);
      setCustomizableWidgets(prev => prev.filter(w => w.id !== widgetId));
      alert("Widget removed from dashboard.");
    } catch (error) {
      alert("Failed to remove widget.");
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(customizableWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCustomizableWidgets(items);
    console.log("Widget moved!");
  };

  const currentCustomWidgetCount = customizableWidgets.length;
  const remainingSlots = MAX_CUSTOMIZABLE_WIDGETS - currentCustomWidgetCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white flex items-center gap-3">
              <LayoutGrid className="text-amber-400" />
              My Dashboard
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
        
        {/* Connection Status Banner */}
        {error && error.includes('Connect to your broker') && (
          <div className="mb-6">
            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  size="sm" 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 ml-4"
                  onClick={() => window.location.href = '/broker-integration'}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Broker
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Fixed Essential Widgets Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">Essential Insights</h2>
            <Badge className="bg-blue-100 text-blue-800">Always Visible</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="lg:col-span-12">
              <WidgetWrapper title="Portfolio Summary" isFixed={true} isEditMode={false}>
                <PortfolioSummaryCards summary={portfolioSummary} isLoading={isLoading} />
              </WidgetWrapper>
            </div>
            
            <div className="lg:col-span-4">
              <WidgetWrapper title="Trading Engine Status" isFixed={true} isEditMode={false}>
                <TradingStatus {...fixedWidgetsProps.tradingStatus} />
              </WidgetWrapper>
            </div>
            
            <div className="lg:col-span-4">
              <WidgetWrapper title="Recent Activity" isFixed={true} isEditMode={false}>
                <RecentTrades {...fixedWidgetsProps.recentTrades} />
              </WidgetWrapper>
            </div>
            
            <div className="lg:col-span-4">
              <WidgetWrapper title="AI Provider Status" isFixed={true} isEditMode={false}>
                <BYOAIStatusWidget />
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
            <Loader2 className="animate-spin h-12 w-12 text-amber-400" />
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
                    const WidgetComponent = widgetMap[widget.widget_type];
                    
                    return (
                      <Draggable key={widget.id.toString()} draggableId={widget.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`lg:col-span-6 transition-all duration-200 ${snapshot.isDragging ? 'z-50 scale-105 shadow-2xl' : ''}`}
                          >
                            <WidgetWrapper 
                              title={widget.widget_type.replace(/([A-Z])/g, ' $1').trim()} 
                              onRemove={() => onRemoveWidget(widget.id)}
                              isEditMode={isEditMode}
                              dragHandleProps={provided.dragHandleProps}
                              isDragging={snapshot.isDragging}
                              isFixed={false}
                            >
                              {WidgetComponent ? (
                                <React.Suspense fallback={<LoadingFallback title={widget.widget_type} />}>
                                  <WidgetComponent {...widget.props_config} isDashboardWidget={true} />
                                </React.Suspense>
                              ) : (
                                <div className="text-slate-400">Unknown Widget Type</div>
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
