# LEAK-001: Session Persistence User ID Extraction Issue

## Symptom
- **Issue**: Frontend fails to persist user_id after broker authentication
- **Impact**: AI features return "unauthorized", portfolio data fails to load
- **Severity**: Critical

## Evidence
- **Logs**: `[sessionStore] Normalizing session without userId - this may cause issues`
- **Console Errors**: `Missing broker identifiers`, `TypeError: Load failed`
- **User Reports**: Persistent user_id: null in session data

## Root Cause
- **Analysis**: sessionStore.normalizeSessionPayload() was not properly extracting user_id from OAuth callback response
- **Code Location**: src/api/sessionStore.js:9-16
- **Dependencies**: BrokerCallback.jsx, railwayAPI.js, AI components

## Fix
- **Commit SHA**: a3e93ecc143de0b29c0aa6074f447e3421e07843
- **Changes**: Enhanced normalizeSessionPayload() to handle multiple user_id sources including payload.data?.user_id
- **Test Proof**: All AI endpoints now receive proper X-User-ID headers
- **Verification**: Console shows proper user_id extraction and persistence

## Deploy Confirmation
- **Version Endpoint**: Frontend v1.0.3, Backend v2.0.11
- **Digest**: Railway deployment successful
- **Status**: Verified in production
- **Timestamp**: 2025-10-02T04:49:44Z

## Status
- [x] Identified
- [x] Fixed
- [x] Tested
- [x] Deployed
- [x] Verified
