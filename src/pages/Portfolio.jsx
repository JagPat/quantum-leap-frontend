
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import all required components for both levels
import PortfolioTable from '../components/portfolio/PortfolioTable';
import AIRecommendationsPanel from '../components/portfolio/AIRecommendationsPanel';
import PortfolioAnalytics from '../components/portfolio/PortfolioAnalytics';
import PerformanceComparisonTool from '../components/portfolio/PerformanceComparisonTool';
import StrategyAttributionView from '../components/portfolio/StrategyAttributionView';
import AISummaryPanel from '../components/portfolio/AISummaryPanel'; // Import the new component
import { Brain, LineChart, GanttChartSquare } from 'lucide-react';
import PinnableWidget from '../components/dashboard/PinnableWidget';
import PortfolioSummaryCards from '../components/portfolio/PortfolioSummaryCards';


export default function PortfolioPage() {
  const [activeView, setActiveView] = useState('overview'); // 'overview' or 'analysis'

  const portfolioSummary = {
    total_value: 346255,
    total_pnl: 21250,
    total_pnl_percent: 6.5,
    todays_pnl: 1211,
    todays_pnl_percent: 0.35,
  };

  // Dummy Data for the new AI-centric holdings table
  const holdingsData = [
    { id: 1, symbol: 'RELIANCE', quantity: 50, avg_price: 2450.75, current_price: 2855.50, unrealized_pnl: 20237.5, pnl_percent: 16.5, entry_date: '2023-05-10', ai_target_price: 3000, ai_action: 'HOLD', confidence_score: 88, strategy: 'MomentumBoost' },
    { id: 2, symbol: 'INFY', quantity: 75, avg_price: 1750.00, current_price: 1550.25, unrealized_pnl: -14981.25, pnl_percent: -11.41, entry_date: '2023-02-15', ai_target_price: 1500, ai_action: 'SELL', confidence_score: 92, strategy: 'MeanReversion' },
    { id: 3, symbol: 'TCS', quantity: 25, avg_price: 3650.25, current_price: 3825.00, unrealized_pnl: 4368.75, pnl_percent: 4.79, entry_date: '2023-08-01', ai_target_price: 4000, ai_action: 'BUY', confidence_score: 75, strategy: 'MomentumBoost' },
    { id: 4, symbol: 'HDFCBANK', quantity: 30, avg_price: 1580.50, current_price: 1610.00, unrealized_pnl: 885, pnl_percent: 1.86, entry_date: '2023-09-20', ai_target_price: 1750, ai_action: 'HOLD', confidence_score: 65, strategy: 'ValueInvest' },
  ];
  
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Portfolio Overview</h1>
        <Button onClick={() => setActiveView('analysis')} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
          View Detailed Analysis
        </Button>
      </div>
      
      <PinnableWidget widgetType="PortfolioSummaryCards" defaultLayout={{ w: 12, h: 2 }}>
        <PortfolioSummaryCards summary={portfolioSummary} />
      </PinnableWidget>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {/* PortfolioTable is not a standalone widget in this design */}
          <PortfolioTable holdings={holdingsData} />
        </div>
        <div className="lg:col-span-1">
          <PinnableWidget widgetType="AIRecommendationsPanel" defaultLayout={{ w: 4, h: 5 }}>
            <AIRecommendationsPanel />
          </PinnableWidget>
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Portfolio Analysis</h1>
        <Button onClick={() => setActiveView('overview')} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white">
          Back to Overview
        </Button>
      </div>
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/80">
          <TabsTrigger value="performance"><LineChart className="w-4 h-4 mr-2"/> Performance</TabsTrigger>
          <TabsTrigger value="attribution"><GanttChartSquare className="w-4 h-4 mr-2"/> Strategy Attribution</TabsTrigger>
          <TabsTrigger value="comparison"><Brain className="w-4 h-4 mr-2"/> AI Comparison Tool</TabsTrigger>
        </TabsList>
        <TabsContent value="performance" className="mt-4">
          <AISummaryPanel title="AI Performance Summary">
            <p>
              Over the last 6 months, your portfolio has underperformed the NIFTY 50 benchmark by <strong className="text-red-400">-3.2%</strong>.
            </p>
            <p>
              The primary contributor to this lag is your significant exposure to the IT sector, which has seen a downturn. Your holdings in <strong className="text-green-400">RELIANCE</strong> have partially offset these losses.
            </p>
            <p className="font-semibold text-amber-300">
              Recommendation: Consider rebalancing to increase exposure to the FMCG and Auto sectors to improve diversification.
            </p>
          </AISummaryPanel>
          <PinnableWidget widgetType="PortfolioAnalytics" defaultLayout={{ w: 6, h: 4 }}>
            <PortfolioAnalytics />
          </PinnableWidget>
        </TabsContent>
        <TabsContent value="attribution" className="mt-4">
          <AISummaryPanel title="AI Strategy Attribution Summary">
            <p>
              The <strong className="text-green-400">MomentumBoost</strong> strategy is the primary driver of gains, contributing over <strong className="text-green-400">₹2,200</strong> in P&L across 15 trades.
            </p>
            <p>
              Conversely, the <strong className="text-red-400">MeanReversion</strong> strategy has shown mixed results, with a lower win rate of 55%.
            </p>
            <p className="font-semibold text-amber-300">
              Recommendation: Allocate more capital to MomentumBoost and review the parameters for MeanReversion to improve its performance.
            </p>
          </AISummaryPanel>
          <PinnableWidget widgetType="StrategyAttributionView" defaultLayout={{ w: 8, h: 6 }}>
             <StrategyAttributionView />
          </PinnableWidget>
        </TabsContent>
        <TabsContent value="comparison" className="mt-4">
          <AISummaryPanel title="AI Comparison Summary">
            <p>
              Your portfolio shows higher volatility compared to the NIFTY 50 index. While it captured more upside in early 2024, it also experienced a deeper drawdown in March.
            </p>
            <p>
              The AI-suggested asset <strong className="text-green-400">TCS</strong> has consistently outperformed both your portfolio and the index, indicating strong momentum in large-cap IT.
            </p>
             <p className="font-semibold text-amber-300">
              Recommendation: Explore adding high-momentum stocks like TCS to potentially enhance returns while monitoring overall portfolio volatility.
            </p>
          </AISummaryPanel>
          <PinnableWidget widgetType="PerformanceComparisonTool" defaultLayout={{ w: 8, h: 5 }}>
            <PerformanceComparisonTool />
          </PinnableWidget>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {activeView === 'overview' ? renderOverview() : renderAnalysis()}
    </div>
  );
}
