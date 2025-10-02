# Deployment Verification Guide - Unified Session Schema Fix

**Commit**: `451ea35`  
**Date**: October 2, 2025  
**Status**: 🚀 Deployed to Railway

---

## 🎯 Quick Testing Guide

### 1. Clear Browser Cache First (IMPORTANT!)

Before testing, clear your browser cache and localStorage to start fresh:

```javascript
// Open browser console and run:
localStorage.clear();
location.reload();
```

**Why?** Old session data in snake_case format may cause confusion during testing.

---

### 2. Test OAuth Flow (5 minutes)

**Steps**:
1. Go to: https://quantum-leap-frontend-production.up.railway.app/settings
2. Click "Connect Broker" → "Zerodha"
3. Enter API Key and Secret
4. Complete OAuth on Zerodha
5. Get redirected back to `/broker-callback`

**Expected Console Logs**:
```javascript
💾 [brokerSessionStore] persist() called with payload: { config_id, user_id, ... }
💾 [brokerSessionStore] Storing to localStorage: { configId: ..., userId: "EBW183", ... }
✅ [brokerSessionStore] Successfully persisted to localStorage (snake_case)
🔄 [brokerSessionStore] Returning camelCase session: { configId, userId, ... }
```

**Success Criteria**:
- ✅ No errors during redirect
- ✅ Console shows "Successfully persisted"
- ✅ Console shows "Returning camelCase session"
- ✅ `userId` is NOT null

---

### 3. Test Session Load (2 minutes)

**Steps**:
1. After OAuth completes, reload the page
2. Open browser console

**Expected Console Logs**:
```javascript
📖 [brokerSessionStore] Loaded raw session from localStorage: { config_id, user_id, ... }
🔄 [brokerSessionStore] Transformed to camelCase: { configId, userId, ... }
```

**Success Criteria**:
- ✅ Console shows "Loaded raw session" (snake_case)
- ✅ Console shows "Transformed to camelCase"
- ✅ No "Normalizing session without userId" warnings

---

### 4. Test Portfolio (3 minutes)

**Steps**:
1. Go to: https://quantum-leap-frontend-production.up.railway.app/portfolio
2. Check if holdings/positions load

**Expected Console Logs**:
```javascript
// Should NOT see these old errors:
❌ [BrokerIntegration] Failed to fetch portfolio Error: Missing broker identifiers
❌ [RailwayAPI] Missing authorization for authenticated endpoint

// Should see successful fetch:
✅ [RailwayAPI] Success { endpoint: "/api/broker/portfolio", hasData: true }
```

**Success Criteria**:
- ✅ Portfolio data displays
- ✅ No "Missing broker identifiers" errors
- ✅ Holdings/positions show correctly

---

### 5. Test AI Settings (3 minutes)

**Steps**:
1. Go to: https://quantum-leap-frontend-production.up.railway.app/settings
2. Click "AI Configuration" tab
3. Enter an OpenAI API key (or test key)
4. Click "Save"

**Expected Console Logs**:
```javascript
🔐 [RailwayAPI] Using auth headers for user: "EBW183" config: "UUID"
🚀 [RailwayAPI] POST https://web-production-de0bc.up.railway.app/api/ai/preferences
✅ [RailwayAPI] Success { preferences: { ... } }
```

**Success Criteria**:
- ✅ API key saves successfully
- ✅ No "unauthorized" errors
- ✅ AI status shows "configured"
- ✅ No "user_id: null" warnings

---

### 6. Verify localStorage Format (1 minute)

**Steps**:
1. Open DevTools → Application → Local Storage
2. Find `activeBrokerSession` key
3. Check the JSON structure

**Expected Format** (snake_case):
```json
{
  "config_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "EBW183",
  "broker_name": "zerodha",
  "session_status": "connected",
  "needs_reauth": false,
  "connection_status": { "state": "connected", "message": "...", "lastChecked": "..." },
  "updated_at": "2025-10-02T..."
}
```

**Success Criteria**:
- ✅ Uses **snake_case** property names (backend compliance)
- ✅ `user_id` is present and NOT null
- ✅ `config_id` is a valid UUID

---

## 🚨 Common Issues & Solutions

### Issue 1: Still seeing "Missing broker identifiers"
**Cause**: Old session data in localStorage  
**Solution**: 
```javascript
localStorage.clear();
location.reload();
// Then re-authenticate with broker
```

### Issue 2: "user_id: null" in console
**Cause**: Backend not returning user_id properly  
**Solution**: Check backend logs for OAuth callback. Verify Zerodha API profile fetch succeeds.

### Issue 3: Components still using snake_case
**Cause**: Frontend deployment didn't complete or cached  
**Solution**: 
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check Network tab → verify JS files have new timestamps
- Check Railway: verify deployment shows commit `451ea35`

### Issue 4: TypeError accessing session properties
**Cause**: Component code not updated or still has old logic  
**Solution**: All components should now use camelCase. If you see errors, check which component and verify it uses `session.userId` not `session.user_id`.

---

## ✅ Final Verification Checklist

After running all tests above, confirm:

- [ ] OAuth flow completes without errors
- [ ] Console shows transformation logs (persist → load)
- [ ] localStorage stores snake_case format
- [ ] Components receive camelCase properties
- [ ] Portfolio loads successfully
- [ ] AI settings save successfully
- [ ] No "Missing broker identifiers" errors
- [ ] No "user_id: null" warnings
- [ ] No TypeError exceptions

**If all checked** → 🎊 Deployment is successful!

**If any fail** → Check the issue in "Common Issues & Solutions" above.

---

## 📞 Debugging Support

If issues persist:

1. **Check Railway Deployment**:
   - Go to Railway dashboard
   - Verify "Deployment successful" status
   - Check build logs for errors
   - Verify commit SHA is `451ea35`

2. **Check Backend Logs**:
   - Railway → Backend service → Deploy Logs
   - Look for OAuth callback logs
   - Verify user_id extraction from Zerodha profile

3. **Check Frontend Build**:
   - Railway → Frontend service → Deploy Logs
   - Verify build completed without errors
   - Check nginx started successfully

4. **Export Logs**:
   ```javascript
   // In browser console, copy session data:
   const session = JSON.parse(localStorage.getItem('activeBrokerSession'));
   console.log('Session:', session);
   
   // Take screenshot of console logs
   // Share with development team
   ```

---

## 🎯 Expected Timeline

| Step | Duration | Status |
|------|----------|--------|
| Git push | 10s | ✅ Complete |
| Railway deployment | 2-3 min | ⏳ In progress |
| First OAuth test | 5 min | ⏳ Pending |
| Full verification | 15 min | ⏳ Pending |
| **Total** | **~20 min** | ⏳ |

---

## 📚 Reference Documents

- **Implementation Details**: `UNIFIED_SESSION_SCHEMA_FIX_RESULTS.md`
- **LEAK-001 Analysis**: `docs/citations/LEAK-001.md`
- **LEAK-002 Analysis**: `docs/citations/LEAK-002.md`
- **Database Schema**: `backend-temp/DATABASE_USER_ID_DOCUMENTATION.md`

---

**Status**: 🚀 Ready for User Testing  
**Next**: Wait for Railway deployment, then run verification tests above.

