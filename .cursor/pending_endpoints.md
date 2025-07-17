# Pending Backend Endpoints

## Overview
This document tracks frontend-expected endpoints that are not yet available in the backend deployment.

**Backend URL**: https://web-production-de0bc.up.railway.app  
**Current Deployment**: phase-2.3-stable (69c1215...)  
**Last Updated**: 2024-07-16

## 🔴 Missing Endpoints (Backend Required)

### Auth Endpoints
- `GET /api/auth/broker/test-oauth` - #backend_required
- `GET /api/auth/broker/status` - #backend_required

### Broker Endpoints (Extended)
- `GET /api/broker/orders` - #backend_required
- `GET /api/broker/status-header` - #backend_required

### AI Endpoints (Extended)
- `POST /api/ai/analysis` - #backend_required
- `GET /api/ai/analytics/performance` - #backend_required
- `GET /api/ai/analytics/strategy/{strategyId}` - #backend_required
- `GET /api/ai/clustering/strategies` - #backend_required
- `POST /api/ai/feedback/outcome` - #backend_required
- `GET /api/ai/feedback/insights` - #backend_required

### Trading Endpoints (Extended)
- `POST /api/trading/place-order` - #backend_required
- `GET /api/trading/orders` - #backend_required
- `GET /api/trading/history` - #backend_required

## ✅ Available Endpoints (Frontend Ready)

### Core Status Endpoints
- `GET /health` - ✅ Available
- `GET /version` - ✅ Available
- `GET /readyz` - ✅ Available

### Broker Endpoints
- `GET /api/broker/status` - ✅ Available
- `GET /api/broker/holdings` - ✅ Available
- `GET /api/broker/positions` - ✅ Available
- `GET /api/broker/profile` - ✅ Available
- `GET /api/broker/margins` - ✅ Available

### Trading Endpoints
- `GET /api/trading/status` - ✅ Available
- `GET /api/trading/positions` - ✅ Available

### Portfolio Endpoints
- `GET /api/portfolio/status` - ✅ Available
- `GET /api/portfolio/latest` - ✅ Available
- `GET /api/portfolio/holdings` - ✅ Available
- `GET /api/portfolio/positions` - ✅ Available
- `POST /api/portfolio/fetch-live` - ✅ Available

### AI Endpoints
- `GET /api/ai/status` - ✅ Available
- `POST /api/ai/strategy` - ✅ Available
- `GET /api/ai/signals` - ✅ Available
- `GET /api/ai/insights/crowd` - ✅ Available
- `GET /api/ai/insights/trending` - ✅ Available
- `POST /api/ai/copilot/analyze` - ✅ Available
- `GET /api/ai/copilot/recommendations` - ✅ Available
- `GET /api/ai/preferences` - ✅ Available
- `POST /api/ai/validate-key` - ✅ Available

### Auth Endpoints
- `GET /broker/callback` - ✅ Available
- `POST /broker/generate-session` - ✅ Available
- `GET /broker/session` - ✅ Available
- `POST /broker/invalidate-session` - ✅ Available
- `GET /broker/profile` - ✅ Available
- `GET /broker/margins` - ✅ Available
- `POST /broker/disconnect` - ✅ Available
- `POST /broker/disconnect-session` - ✅ Available

## 🎯 Frontend Integration Status

### Ready for Testing
- ✅ Broker Integration (`/broker` tab)
- ✅ Trading Operations (`/trading` tab)
- ✅ Portfolio Management (`/portfolio` tab)
- ✅ AI Engine (`/ai` tab)

### Requires Backend Implementation
- 🔴 Extended Auth Features
- 🔴 Order Management
- 🔴 Advanced AI Analytics
- 🔴 Trading History

## 📋 Next Steps

1. **Frontend Alignment**: Update `railwayAPI.js` to use only available endpoints
2. **Graceful Fallbacks**: Implement 401/404 handling for missing endpoints
3. **Backend Development**: Implement missing endpoints tagged with #backend_required
4. **Testing**: Validate all available endpoints work with frontend components 