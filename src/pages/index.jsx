import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'
import MyDashboard from './MyDashboard'
import { Loader2, AlertCircle } from 'lucide-react'
import ErrorBoundary from '../components/ErrorBoundary'

// Lazy load all heavy components for optimal performance
const Portfolio = React.lazy(() => import('./Portfolio'))
const PortfolioNew = React.lazy(() => import('./PortfolioNew'))
const AI = React.lazy(() => import('./AI'))
const Trading = React.lazy(() => import('./Trading'))
const TradeHistory = React.lazy(() => import('./TradeHistory'))
const Settings = React.lazy(() => import('./Settings'))
const BrokerIntegration = React.lazy(() => import('./BrokerIntegration'))
const BrokerCallback = React.lazy(() => import('./BrokerCallback'))
const ApiSpec = React.lazy(() => import('./ApiSpec'))
const StrategyDetail = React.lazy(() => import('./StrategyDetail'))
const Widgets = React.lazy(() => import('./Widgets'))
const Phase23TestDashboard = React.lazy(() => import('../components/dashboard/Phase23TestDashboard'))
const OAuthTestDashboard = React.lazy(() => import('../components/testing/OAuthTestDashboard'))

// Enhanced loading component for better UX
const LoadingFallback = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-slate-900">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      <span className="text-slate-300 text-lg">{text}</span>
    </div>
  </div>
)

// Error fallback for failed lazy loads
const LazyErrorFallback = ({ error, retry }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-slate-900">
    <div className="flex flex-col items-center space-y-4 text-center">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <span className="text-slate-300 text-lg">Failed to load page</span>
      <button 
        onClick={retry}
        className="px-4 py-2 bg-amber-500 text-slate-900 rounded hover:bg-amber-600"
      >
        Try Again
      </button>
    </div>
  </div>
)

// Wrapper for lazy components with error boundaries
const LazyWrapper = ({ children, fallbackText }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback text={fallbackText} />}>
      {children}
    </Suspense>
  </ErrorBoundary>
)

export default function Pages() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><MyDashboard /></Layout>} />
        
        <Route path="/portfolio" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Portfolio...">
              <PortfolioNew />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/portfolio-old" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Old Portfolio...">
              <Portfolio />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/ai" element={
          <Layout>
            <LazyWrapper fallbackText="Loading AI Engine...">
              <AI />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/trading" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Trading...">
              <Trading />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/trade-history" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Trade History...">
              <TradeHistory />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/settings" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Settings...">
              <Settings />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/broker-integration" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Broker Integration...">
              <BrokerIntegration />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/broker-callback" element={
          <LazyWrapper fallbackText="Processing Authentication...">
            <BrokerCallback />
          </LazyWrapper>
        } />
        
        <Route path="/api-spec" element={
          <Layout>
            <LazyWrapper fallbackText="Loading API Documentation...">
              <ApiSpec />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/strategy/:id" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Strategy Details...">
              <StrategyDetail />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/widgets" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Widgets...">
              <Widgets />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/phase23-test" element={
          <Layout>
            <LazyWrapper fallbackText="Loading Phase 2.3 Test Dashboard...">
              <Phase23TestDashboard />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="/oauth-test" element={
          <Layout>
            <LazyWrapper fallbackText="Loading OAuth Test Dashboard...">
              <OAuthTestDashboard />
            </LazyWrapper>
          </Layout>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
} 