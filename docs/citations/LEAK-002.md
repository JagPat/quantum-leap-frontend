# LEAK-002: Inconsistent Session Property Naming Across Stack

## Symptom
- **Issue**: Frontend components expect camelCase properties but session store uses snake_case
- **Impact**: Components fail to access session data correctly, broker fetch fails
- **Severity**: High

## Evidence
- **Logs**: Components accessing session.session_status instead of session.sessionStatus
- **Console Errors**: "Missing broker identifiers" due to property name mismatch
- **Code Analysis**: Multiple components using inconsistent property names
- **Pattern**: Backend uses snake_case (Zerodha API), Frontend expects camelCase (React convention)

## Root Cause Analysis

### The Inconsistency Problem
1. **Backend/API Layer**: Uses snake_case (Zerodha Kite Connect API standard)
   - Example: `{ config_id, user_id, broker_name, session_status }`
   
2. **Storage Layer**: localStorage stores snake_case
   - Key: `activeBrokerSession`
   - Data: `{ config_id, user_id, broker_name, session_status }`
   
3. **Component Layer**: Expects camelCase (React/JavaScript convention)
   - Expected: `{ configId, userId, brokerName, sessionStatus }`
   - Actual: Received snake_case from sessionStore.load()
   - **Result**: Property access failures (`session.userId` returned `undefined`)

### Code Location
- **Primary**: src/api/sessionStore.js (no transformation layer)
- **Affected**: 12+ files consuming session data
  - src/hooks/useBrokerSession.js
  - src/pages/Portfolio.jsx
  - src/pages/AI.jsx
  - src/contexts/AuthContext.jsx
  - src/contexts/AIStatusContext.jsx
  - src/components/settings/AISettingsForm.jsx
  - And more...

## Fix - Unified Session Schema with Transformation Layer

### Phase 1: Component Updates (Temporary Fix)
- **Commit SHA**: e0fb4ab
- **Approach**: Updated components to use snake_case (wrong direction)
- **Status**: Partially addressed symptoms but violated React conventions

### Phase 2: Complete Architectural Fix (FINAL SOLUTION)
- **Commit SHA**: [PENDING - current commit]
- **Approach**: Transform at the boundary layer (sessionStore)
- **Strategy**: 
  1. **Store snake_case** (Zerodha/backend compliance)
  2. **Load camelCase** (React/component compliance)
  3. **Transform centrally** (single source of truth)

### Implementation Details

```javascript
// NEW: Centralized transformation function
const transformToCamelCase = (session) => {
  if (!session) return null;
  
  return {
    configId: session.config_id,
    userId: session.user_id,
    brokerName: session.broker_name,
    sessionStatus: session.session_status,
    needsReauth: session.needs_reauth,
    connectionStatus: session.connection_status,
    lastTokenRefresh: session.last_token_refresh,
    lastStatusCheck: session.last_status_check,
    tokenStatus: session.token_status,
    userData: session.user_data,
    updatedAt: session.updated_at
  };
};

// UPDATED: persist() stores snake_case, returns camelCase
persist(payload) {
  const normalized = normalizeSessionPayload(payload); // snake_case
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(normalized));
  return transformToCamelCase(normalized); // ← Return camelCase for immediate use
}

// UPDATED: load() transforms to camelCase
load() {
  const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
  const parsed = JSON.parse(raw);
  const normalized = normalizeSessionPayload(parsed);
  return transformToCamelCase(normalized); // ← CRITICAL FIX
}
```

### Benefits of This Approach
1. **Zerodha Compliance**: Storage maintains snake_case (backend/API standard)
2. **React Compliance**: Components receive camelCase (frontend convention)
3. **Single Transformation Point**: All conversions happen in sessionStore
4. **Type Safety**: Consistent property names across all components
5. **Maintainability**: Future changes only need to update transformToCamelCase()

## Test Coverage

### Unit Tests (20/20 Passed)
- ✅ Extract user_id from multiple sources
- ✅ Store in snake_case format
- ✅ Load with camelCase transformation
- ✅ Round-trip data integrity
- ✅ OAuth callback data structure
- ✅ Regression tests for LEAK-001 and LEAK-002
- ✅ Zerodha API compliance verification

### Test Results
```
✓ src/api/sessionStore.test.js (20 tests) 7ms
  Test Files  1 passed (1)
       Tests  20 passed (20)
```

## Documentation Updates
- **DATABASE_USER_ID_DOCUMENTATION.md**: Clarifies dual meaning of user_id
- **LEAK-001.md**: Updated with unified schema fix details
- **LEAK-002.md**: This document - complete architectural analysis

## Deploy Confirmation
- **Version Endpoint**: Frontend v2.1.0-rocksolid (pending), Backend v2.0.11
- **Digest**: Railway deployment pending
- **Status**: Tested locally, ready for production
- **Timestamp**: 2025-10-02T06:25:44Z

## Impact Analysis
- **Fixed**: All 12+ components now correctly access session properties
- **Prevented**: Future property name inconsistency bugs
- **Maintained**: Zerodha API compliance and React conventions
- **Simplified**: Single transformation point instead of per-component fixes

## Related Issues
- **LEAK-001**: Session persistence user_id extraction (fixed in same commit)
- **Future**: Consider TypeScript interfaces to enforce property names at compile time

## Status
- [x] Identified (Root cause: missing transformation layer)
- [x] Fixed (Complete schema unification with centralized transformation)
- [x] Tested (20/20 unit tests passed, regression tests included)
- [ ] Deployed (Pending commit and Railway deployment)
- [ ] Verified (Awaiting production verification with user testing)
