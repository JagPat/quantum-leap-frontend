# BMAD Alignment - Frontend-Backend Integration

## Overview
This document tracks the alignment between frontend components and backend endpoints for the Quantum Leap Trading platform.

**Backend URL**: https://web-production-de0bc.up.railway.app  
**Frontend URL**: http://localhost:5173  
**Deployment Tag**: phase-2.3-stable  
**Last Updated**: 2024-07-16

## 🎯 Confirmed Endpoint Availability

### ✅ Core Status Endpoints
- `GET /health` → Frontend: `railwayAPI.healthCheck()`
- `GET /version` → Frontend: `railwayAPI.getVersion()`
- `GET /readyz` → Frontend: `railwayAPI.getReadyz()`

### ✅ Broker Integration
- `GET /api/broker/status` → Frontend: `railwayAPI.getBrokerStatus()`
- `GET /api/broker/holdings` → Frontend: `railwayAPI.getBrokerHoldings(userId)`
- `GET /api/broker/positions` → Frontend: `railwayAPI.getBrokerPositions(userId)`
- `GET /api/broker/profile` → Frontend: `railwayAPI.getBrokerProfile(userId)`
- `GET /api/broker/margins` → Frontend: `railwayAPI.getBrokerMargins(userId)`

### ✅ Trading Operations
- `GET /api/trading/status` → Frontend: `railwayAPI.getTradingStatus()`
- `GET /api/trading/positions` → Frontend: `railwayAPI.getTradingPositions(userId)`

### ✅ Portfolio Management
- `GET /api/portfolio/status` → Frontend: `railwayAPI.getPortfolioStatus()`
- `GET /api/portfolio/latest` → Frontend: `railwayAPI.getPortfolioData(userId)`
- `GET /api/portfolio/holdings` → Frontend: `railwayAPI.getPortfolioHoldings(userId)`
- `GET /api/portfolio/positions` → Frontend: `railwayAPI.getPortfolioPositions(userId)`
- `POST /api/portfolio/fetch-live` → Frontend: `railwayAPI.fetchLivePortfolio(userId)`

### ✅ AI Engine
- `GET /api/ai/status` → Frontend: `railwayAPI.getAIStatus(userId)`
- `POST /api/ai/strategy` → Frontend: `railwayAPI.generateAIStrategy(userId, data)`
- `GET /api/ai/signals` → Frontend: `railwayAPI.getAISignals(userId)`
- `GET /api/ai/insights/crowd` → Frontend: `railwayAPI.getAIInsightsCrowd(userId)`
- `GET /api/ai/insights/trending` → Frontend: `railwayAPI.getAIInsightsTrending(userId)`
- `POST /api/ai/copilot/analyze` → Frontend: `railwayAPI.getCopilotAnalysis(userId, data)`
- `GET /api/ai/copilot/recommendations` → Frontend: `railwayAPI.getCopilotRecommendations(userId)`
- `GET /api/ai/preferences` → Frontend: `railwayAPI.getAIPreferences(userId)`
- `POST /api/ai/validate-key` → Frontend: `railwayAPI.validateAIKey(userId, provider, apiKey)`

### ✅ Authentication
- `GET /broker/callback` → Frontend: OAuth callback handling
- `POST /broker/generate-session` → Frontend: `railwayAPI.generateSession(requestToken, apiKey, apiSecret)`
- `GET /broker/session` → Frontend: `railwayAPI.getBrokerSession(userId)`
- `POST /broker/invalidate-session` → Frontend: `railwayAPI.invalidateSession(userId)`
- `GET /broker/profile` → Frontend: `railwayAPI.getBrokerProfile(userId)`
- `GET /broker/margins` → Frontend: `railwayAPI.getBrokerMargins(userId)`
- `POST /broker/disconnect` → Frontend: Disconnect handling
- `POST /broker/disconnect-session` → Frontend: Session disconnect handling

## 🔗 UI Element Linkage

### Dashboard Components
- **Phase23TestDashboard** → Uses `railwayAPI.getVersion()` for backend status
- **AISignalsWidget** → Uses `railwayAPI.getAISignals(userId)`
- **PortfolioWidget** → Uses `railwayAPI.getPortfolioData(userId)`
- **BrokerStatusWidget** → Uses `railwayAPI.getBrokerStatus()`

### Page Components
- **AI.jsx** → Uses multiple AI endpoints for strategy generation and analysis
- **BrokerIntegration.jsx** → Uses broker authentication and status endpoints
- **Portfolio.jsx** → Uses portfolio data and live fetch endpoints
- **Trading.jsx** → Uses trading status and positions endpoints

### Settings Components
- **AISettingsForm** → Uses `railwayAPI.getAIPreferences()` and `railwayAPI.validateAIKey()`
- **SecuritySettings** → Uses broker authentication endpoints

## 🏷️ Missing API Tags

### #backend_required
- `GET /api/auth/broker/test-oauth` - OAuth testing endpoint
- `GET /api/auth/broker/status` - Auth status endpoint
- `GET /api/broker/orders` - Order management
- `POST /api/ai/analysis` - AI analysis endpoint
- `GET /api/ai/analytics/performance` - Performance analytics
- `GET /api/ai/analytics/strategy/{strategyId}` - Strategy analytics
- `GET /api/ai/clustering/strategies` - Strategy clustering
- `POST /api/ai/feedback/outcome` - AI feedback submission
- `GET /api/ai/feedback/insights` - Feedback insights
- `POST /api/trading/place-order` - Order placement
- `GET /api/trading/orders` - Order history
- `GET /api/trading/history` - Trading history

## 🛡️ Error Handling Strategy

### 401 Unauthorized
- **Frontend Response**: Show "Connect Broker" state
- **User Action**: Redirect to broker setup
- **API Behavior**: Return `{ status: 'unauthorized', requiresAuth: true }`

### 404 Not Found
- **Frontend Response**: Show "Feature Coming Soon" message
- **User Action**: Display planned feature information
- **API Behavior**: Return `{ status: 'not_implemented', endpoint: '/path' }`

### 500 Server Error
- **Frontend Response**: Show error message with retry option
- **User Action**: Allow manual retry or fallback to cached data
- **API Behavior**: Throw error for frontend handling

## 📊 Test Coverage Status

### ✅ Ready for Testing
- **Broker Tab** (`/broker`) - All core endpoints available
- **Trading Tab** (`/trading`) - Status and positions available
- **Portfolio Tab** (`/portfolio`) - All portfolio endpoints available
- **AI Tab** (`/ai`) - All AI endpoints available

### 🔄 In Progress
- **Error Handling** - Graceful fallbacks for missing endpoints
- **Status Detection** - Using `/status` endpoints for UI state control
- **Authentication Flow** - OAuth integration with broker

### 📋 Next Steps
1. **End-to-End Testing** - Validate all available endpoints work with frontend
2. **Missing Endpoint Implementation** - Backend development for tagged endpoints
3. **Performance Optimization** - Caching and request optimization
4. **User Experience** - Smooth transitions between connected/disconnected states

## 🎯 Success Criteria

- [x] All available endpoints return proper JSON responses
- [x] Frontend gracefully handles missing endpoints
- [x] Authentication flow works for protected endpoints
- [x] Status endpoints control UI state appropriately
- [x] Error messages guide users to appropriate actions
- [ ] All frontend tabs can be tested with backend integration
- [ ] Missing endpoints are properly documented and tagged 