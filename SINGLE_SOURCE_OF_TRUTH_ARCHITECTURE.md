# 🎯 Single Source of Truth - Broker Authentication Architecture

## Overview

This document defines the **SINGLE SOURCE OF TRUTH** for broker authentication across the entire QuantumLeap Trading Platform.

**Date:** October 1, 2025  
**Status:** ✅ **IMPLEMENTED AND DEPLOYED**

---

## The Problem (Before)

Previously, different parts of the application checked broker authentication in **different ways**:

### ❌ OLD (Inconsistent):
```javascript
// Method 1: Some components checked 'brokerConfigs' array
const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
const activeConfig = configs.find(c => c.is_connected);

// Method 2: Others checked 'activeBrokerSession' object
const session = localStorage.getItem('activeBrokerSession');

// Method 3: Some used useBrokerSession hook
const { session } = useBrokerSession();
```

**Result:** Components would disagree on authentication state!
- Broker connected → Portfolio works ✅
- Same user → AI Config says "not authenticated" ❌

---

## The Solution (Now)

### ✅ SINGLE SOURCE OF TRUTH: `brokerSessionStore`

**Location:** `src/api/sessionStore.js`

**Storage Key:** `activeBrokerSession` in localStorage

**Access Method:**
```javascript
import { brokerSessionStore } from '@/api/sessionStore';

// Load current session
const session = brokerSessionStore.load();

// Check if authenticated
const isAuthenticated = session?.session_status === 'connected';

// Get user ID
const userId = session?.user_data?.user_id || session?.broker_user_id;

// Get config ID
const configId = session?.config_id;
```

---

## Architecture Rules

### 🔐 Rule #1: Authentication Check
**ALL components must check authentication using `brokerSessionStore.load()`**

```javascript
// ✅ CORRECT
import { brokerSessionStore } from '@/api/sessionStore';

const checkAuth = async () => {
  const session = brokerSessionStore.load();
  
  if (!session || session.session_status !== 'connected') {
    // Not authenticated
    return false;
  }
  
  // Authenticated
  return true;
};
```

```javascript
// ❌ WRONG - Don't do this!
const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
const activeConfig = configs.find(c => c.is_connected);
```

---

### 🔑 Rule #2: API Headers
**ALL API calls to AI/Trading endpoints must use `X-Config-ID` header**

```javascript
// ✅ CORRECT
const session = brokerSessionStore.load();
const userId = session?.user_data?.user_id || session?.broker_user_id;

const response = await fetch('/api/ai/preferences', {
  headers: {
    'X-User-ID': userId,
    'X-Config-ID': session.config_id  // Use config ID for auth
  }
});
```

```javascript
// ❌ WRONG - Don't use legacy Authorization header!
const response = await fetch('/api/ai/preferences', {
  headers: {
    'X-User-ID': userId,
    'Authorization': `token ${apiKey}:${accessToken}`  // DEPRECATED!
  }
});
```

---

### 📝 Rule #3: Session Updates
**Only update session through `brokerSessionStore.persist()`**

```javascript
// ✅ CORRECT
import { brokerSessionStore } from '@/api/sessionStore';

const updateSession = (newData) => {
  brokerSessionStore.persist({
    config_id: newData.configId,
    user_id: newData.userId,
    broker_name: 'zerodha',
    session_status: 'connected',
    user_data: newData.userData,
    connection_status: {
      state: 'connected',
      message: 'Successfully authenticated'
    }
  });
};
```

```javascript
// ❌ WRONG - Don't write to localStorage directly!
localStorage.setItem('brokerConfigs', JSON.stringify(configs));  // NO!
localStorage.setItem('activeBrokerSession', JSON.stringify(session));  // NO!
```

---

## Component Alignment

All components have been aligned to use `brokerSessionStore`:

### ✅ Aligned Components

#### 1. **AI Configuration (AISettingsForm.jsx)**
```javascript
// Line 130-137
const { brokerSessionStore } = await import('@/api/sessionStore');
const activeSession = brokerSessionStore.load();

const activeConfig = activeSession && activeSession.session_status === 'connected' ? {
  user_data: activeSession.user_data,
  config_id: activeSession.config_id,
  is_connected: true
} : null;
```

#### 2. **AI Page (AI.jsx)**
```javascript
// Line 207-210
const { brokerSessionStore } = await import('@/api/sessionStore');
const activeSession = brokerSessionStore.load();

if (!activeSession || activeSession.session_status !== 'connected') {
  // Not authenticated
}
```

#### 3. **Auth Context (AuthContext.jsx)**
```javascript
// Line 50-51
const { brokerSessionStore } = await import('@/api/sessionStore');
const activeSession = brokerSessionStore.load();
```

#### 4. **AI Status Context (AIStatusContext.jsx)**
```javascript
// Line 59-60
const { brokerSessionStore } = await import('@/api/sessionStore');
const activeSession = brokerSessionStore.load();
```

#### 5. **Broker Integration (BrokerIntegration.jsx)**
```javascript
// Uses useBrokerSession hook (which uses brokerSessionStore internally)
const { session, isLoading, checkConnection } = useBrokerSession();
```

#### 6. **Portfolio Page (Portfolio.jsx)**
```javascript
// Uses useBrokerSession hook
const { session, refresh, needsReauth } = useBrokerSession();
```

---

## Session Data Structure

### Standard Session Object

```typescript
interface BrokerSession {
  config_id: string;              // Primary identifier (UUID)
  user_id?: string;               // User ID (if available)
  broker_user_id?: string;        // Broker's user ID (e.g., "EBW183")
  broker_name: string;            // "zerodha"
  session_status: string;         // "connected" | "disconnected" | "error"
  needs_reauth: boolean;          // Whether re-authentication is needed
  
  user_data?: {
    user_id: string;              // Broker's user ID
    user_name?: string;
    email?: string;
  };
  
  connection_status: {
    state: string;                // "connected" | "disconnected" | "error"
    message: string;
    lastChecked: string;          // ISO timestamp
  };
  
  token_status?: {
    status: string;               // "connected" | "expired" | "invalid"
    expiresAt: string;            // ISO timestamp
    needsReauth: boolean;
  };
  
  portfolio_data?: {
    holdings: Array<any>;
    positions: Array<any>;
    summary: Object;
  };
}
```

---

## Backend API Alignment

### Broker Status Endpoint

**URL:** `/api/modules/auth/broker/status?config_id=<CONFIG_ID>`

**Response:**
```json
{
  "success": true,
  "data": {
    "configId": "a92bddd0-592c-4f41-813a-d42247d8919d",
    "isConnected": true,
    "connectionStatus": {
      "state": "connected",
      "message": "Successfully connected to Zerodha",
      "lastChecked": "2025-10-01T04:30:29.550Z"
    },
    "tokenStatus": {
      "status": "connected",
      "expiresAt": "2025-10-02T04:25:29.540Z",
      "needsReauth": false
    },
    "sessionStatus": "connected",
    "brokerName": "zerodha"
  }
}
```

**Frontend Usage:**
```javascript
const session = brokerSessionStore.load();
const response = await fetch(`/api/modules/auth/broker/status?config_id=${session.config_id}`);
```

---

## Migration Guide

### For New Features

When adding new features that require broker authentication:

1. **Import the store:**
   ```javascript
   import { brokerSessionStore } from '@/api/sessionStore';
   ```

2. **Check authentication:**
   ```javascript
   const session = brokerSessionStore.load();
   if (!session || session.session_status !== 'connected') {
     // Handle unauthenticated state
     return;
   }
   ```

3. **Use config_id for API calls:**
   ```javascript
   const userId = session.user_data?.user_id || session.broker_user_id;
   const response = await fetch('/api/your-endpoint', {
     headers: {
       'X-User-ID': userId,
       'X-Config-ID': session.config_id
     }
   });
   ```

### For Existing Features

If you find code using legacy authentication:

1. **Find and replace:**
   ```javascript
   // OLD
   const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');
   const activeConfig = configs.find(c => c.is_connected);
   
   // NEW
   import { brokerSessionStore } from '@/api/sessionStore';
   const session = brokerSessionStore.load();
   ```

2. **Update API headers:**
   ```javascript
   // OLD
   headers: {
     'Authorization': `token ${apiKey}:${accessToken}`
   }
   
   // NEW
   headers: {
     'X-Config-ID': session.config_id
   }
   ```

3. **Test thoroughly** to ensure authentication works

---

## Benefits

### 1. **Consistency**
- All components check authentication the same way
- No more disagreement between components
- Single point of failure → easier debugging

### 2. **Maintainability**
- Change authentication logic in ONE place
- Update session structure in ONE file
- Clear documentation for new developers

### 3. **Security**
- No more `api_key` and `access_token` in headers
- Backend validates using `config_id` from database
- Reduced exposure of sensitive credentials

### 4. **Performance**
- Single localStorage read per component
- No duplicate authentication checks
- Reduced API calls

---

## Testing Checklist

After any authentication changes, verify:

- [ ] Broker connection works (Settings > Broker Integration)
- [ ] Portfolio fetch works (click "Fetch Live Data")
- [ ] AI Configuration page shows authenticated state
- [ ] AI API key fields are enabled
- [ ] Dashboard shows correct user data
- [ ] No console errors about missing auth
- [ ] Session persists after page refresh
- [ ] Logout clears session properly

---

## Troubleshooting

### Issue: "Please connect to your broker" after successful auth

**Cause:** Component is using legacy authentication check

**Fix:**
1. Find the component showing the error
2. Search for `brokerConfigs` in the file
3. Replace with `brokerSessionStore.load()`
4. Update API headers to use `X-Config-ID`

---

### Issue: API returns "unauthorized" or "missing auth"

**Cause:** API headers not using `X-Config-ID`

**Fix:**
```javascript
// Check headers in API call
const session = brokerSessionStore.load();
headers: {
  'X-User-ID': session.user_data?.user_id,
  'X-Config-ID': session.config_id  // Must include this!
}
```

---

### Issue: Session is null after successful OAuth

**Cause:** `BrokerCallback.jsx` not persisting session

**Fix:**
```javascript
// In BrokerCallback.jsx handleSuccessCallback
brokerSessionStore.persist({
  config_id: configIdParam,
  user_id: userId,
  broker_name: 'zerodha',
  session_status: 'connected',
  // ... rest of session data
});
```

---

## Related Files

### Core Files
- `src/api/sessionStore.js` - Session storage API
- `src/hooks/useBrokerSession.js` - React hook for session management
- `src/pages/BrokerCallback.jsx` - OAuth callback handler

### Aligned Components
- `src/pages/AI.jsx`
- `src/components/settings/AISettingsForm.jsx`
- `src/contexts/AuthContext.jsx`
- `src/contexts/AIStatusContext.jsx`
- `src/pages/BrokerIntegration.jsx`
- `src/pages/Portfolio.jsx`

### Backend
- `backend-temp/modules/auth/routes/oauth.js`
- `backend-temp/modules/auth/services/brokerService.js`

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Oct 1, 2025 | 1.0.0 | Initial architecture defined and implemented |
| Oct 1, 2025 | 1.1.0 | All components aligned to use brokerSessionStore |
| Oct 1, 2025 | 1.2.0 | API headers standardized to X-Config-ID |

---

## Conclusion

**The `brokerSessionStore` is now the ONLY way to check broker authentication in the entire application.**

Any component that checks authentication differently is considered **legacy code** and should be migrated.

**Rule:** If you touch authentication code, it MUST use `brokerSessionStore`.

---

**Last Updated:** October 1, 2025  
**Maintainer:** Development Team  
**Status:** ✅ Production Ready

