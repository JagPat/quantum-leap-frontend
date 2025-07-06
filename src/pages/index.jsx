import Layout from "./Layout.jsx";

import Trading from "./Trading";

import BrokerIntegration from "./BrokerIntegration";

import BrokerCallback from "./BrokerCallback";

import ApiSpec from "./ApiSpec";

import StrategyDetail from "./StrategyDetail";

import Settings from "./Settings";

import Portfolio from "./Portfolio";

import TradeHistory from "./TradeHistory";

import MyDashboard from "./MyDashboard";

import Widgets from "./Widgets";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Trading: Trading,
    
    BrokerIntegration: BrokerIntegration,
    
    BrokerCallback: BrokerCallback,
    
    ApiSpec: ApiSpec,
    
    StrategyDetail: StrategyDetail,
    
    Settings: Settings,
    
    Portfolio: Portfolio,
    
    TradeHistory: TradeHistory,
    
    MyDashboard: MyDashboard,
    
    Widgets: Widgets,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Trading />} />
                
                
                <Route path="/Trading" element={<Trading />} />
                
                <Route path="/BrokerIntegration" element={<BrokerIntegration />} />
                
                <Route path="/BrokerCallback" element={<BrokerCallback />} />
                
                <Route path="/ApiSpec" element={<ApiSpec />} />
                
                <Route path="/StrategyDetail" element={<StrategyDetail />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Portfolio" element={<Portfolio />} />
                
                <Route path="/TradeHistory" element={<TradeHistory />} />
                
                <Route path="/MyDashboard" element={<MyDashboard />} />
                
                <Route path="/Widgets" element={<Widgets />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}