import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'
import MyDashboard from './MyDashboard'
import Portfolio from './Portfolio'
import Trading from './Trading'
import TradeHistory from './TradeHistory'
import Settings from './Settings'
import BrokerIntegration from './BrokerIntegration'
import BrokerCallback from './BrokerCallback'
import ApiSpec from './ApiSpec'
import StrategyDetail from './StrategyDetail'
import Widgets from './Widgets'

export default function Pages() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><MyDashboard /></Layout>} />
        <Route path="/dashboard" element={<Layout><MyDashboard /></Layout>} />
        <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
        <Route path="/trading" element={<Layout><Trading /></Layout>} />
        <Route path="/trading/strategy/:id" element={<Layout><StrategyDetail /></Layout>} />
        <Route path="/trade-history" element={<Layout><TradeHistory /></Layout>} />
        <Route path="/broker-integration" element={<Layout><BrokerIntegration /></Layout>} />
        <Route path="/broker/callback" element={<BrokerCallback />} />
        <Route path="/broker-callback" element={<BrokerCallback />} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/api-spec" element={<Layout><ApiSpec /></Layout>} />
        <Route path="/widgets" element={<Layout><Widgets /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
} 