# LEAK-001: Session Persistence User ID Extraction Issue

## Symptom
- **Issue**: Frontend fails to persist user_id after broker authentication
- **Impact**: AI features return "unauthorized", portfolio data fails to load
- **Severity**: Critical

## Evidence
- **Logs**: `[sessionStore] Normalizing session without userId - this may cause issues`
- **Console Errors**: `Missing broker identifiers`, `TypeError: Load failed`
- **User Reports**: Persistent user_id: null in session data

## Root Cause Analysis

### Primary Issue
- **Analysis**: sessionStore.normalizeSessionPayload() was not properly extracting user_id from OAuth callback response
- **Code Location**: src/api/sessionStore.js:9-22
- **Dependencies**: BrokerCallback.jsx, railwayAPI.js, AI components

### Secondary Issue (CRITICAL)
- **Analysis**: sessionStore.load() returned snake_case properties, but components expected camelCase
- **Impact**: Even when user_id was correctly extracted, components couldn't access it due to property name mismatch
- **Code Location**: src/api/sessionStore.js:94-103 (old implementation)

## Fix - Unified Session Schema

### Phase 1: Initial Extraction Fix (Partial)
- **Commit SHA**: a3e93ecc143de0b29c0aa6074f447e3421e07843
- **Changes**: Enhanced normalizeSessionPayload() to handle multiple user_id sources including payload.data?.user_id
- **Status**: Addressed extraction but not transformation

### Phase 2: Complete Schema Unification (FINAL FIX)
- **Commit SHA**: [PENDING - current commit]
- **Changes**:
  1. **Storage Strategy**: All session data stored in snake_case (Zerodha API compliance)
  2. **Transformation Strategy**: sessionStore.load() transforms snake_case → camelCase
  3. **Return Strategy**: persist() returns camelCase for immediate use
  4. **Documentation**: Added DATABASE_USER_ID_DOCUMENTATION.md for clarity
  
- **Code Changes**:
  ```javascript
  // NEW: Transform function for camelCase conversion
  const transformToCamelCase = (session) => ({
    configId: session.config_id,
    userId: session.user_id,
    brokerName: session.broker_name,
    sessionStatus: session.session_status,
    needsReauth: session.needs_reauth,
    // ... all properties transformed
  });
  
  // UPDATED: load() now transforms to camelCase
  load() {
    const parsed = JSON.parse(raw);
    const normalized = normalizeSessionPayload(parsed);
    return transformToCamelCase(normalized); // ← CRITICAL FIX
  }
  ```

- **Test Proof**: 
  - 20/20 unit tests passed (src/api/sessionStore.test.js)
  - Tests verify: extraction, storage format, transformation, round-trip consistency
  - Regression tests for LEAK-001 and LEAK-002 included

- **Verification**: 
  - localStorage stores snake_case (Zerodha compliant)
  - Components receive camelCase (React convention)
  - All session consumers updated to expect camelCase

## Deploy Confirmation
- **Version Endpoint**: Frontend v2.1.0-rocksolid (pending), Backend v2.0.11
- **Digest**: Railway deployment pending
- **Status**: Tested locally, ready for production
- **Timestamp**: 2025-10-02T06:25:44Z

## Impact Analysis
- **Fixed**: Session persistence, AI authorization, portfolio data loading
- **Prevented**: Future naming inconsistency bugs across the stack
- **Maintained**: Zerodha API compliance via snake_case storage
- **Improved**: Code clarity with explicit transformation layer

## Status
- [x] Identified (Root cause: dual issue - extraction + transformation)
- [x] Fixed (Complete schema unification with camelCase transformation)
- [x] Tested (20/20 unit tests passed, regression tests included)
- [ ] Deployed (Pending commit and Railway deployment)
- [ ] Verified (Awaiting production verification)
