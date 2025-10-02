# 🎯 Post-Deployment Authentication Test Plan
**Date:** September 30, 2025  
**Backend Deployment:** ✅ LIVE (uptime: < 2 min, code: v2.0.2)  
**Frontend Deployment:** ✅ LIVE (commit: 9278e62)

---

## ✅ Pre-Test Verification

### Backend Status:
```bash
curl https://web-production-de0bc.up.railway.app/health
# Result: Uptime ~81 seconds (NEW deployment!)
```

### OAuth Module Health:
```bash
curl https://web-production-de0bc.up.railway.app/api/modules/auth/broker/health
# Result: Broker service operational, token manager healthy
```

---

## 📋 Authentication Test Flow

### Step 1: Clear Browser Session
1. Open: https://quantum-leap-frontend-production.up.railway.app/settings
2. Press `F12` (Developer Tools)
3. Go to **Console** tab
4. Run:
   ```javascript
   localStorage.clear();
   console.log('✅ LocalStorage cleared');
   ```
5. **Close and reopen the browser tab**

---

### Step 2: Initiate OAuth Flow
1. On `/settings` page, click **"Broker Setup"** button
2. In the Zerodha Kite Connect Setup section:
   - API Key: `f9s0gfyeu35adwul` (should be pre-filled)
   - API Secret: (enter if not saved)
3. Click the OAuth button / "Connect to Zerodha"

---

### Step 3: Complete Zerodha Login
1. You'll be redirected to: `https://kite.zerodha.com/connect/login`
2. Enter Zerodha credentials
3. Complete 2FA if prompted
4. Zerodha redirects to: `https://web-production-de0bc.up.railway.app/broker/callback?request_token=...`
5. Backend processes the OAuth callback
6. Backend redirects to: `https://quantum-leap-frontend-production.up.railway.app/broker-callback?status=success&config_id=...&user_id=EBW183`
7. Frontend processes the callback and redirects to `/settings`

---

### Step 4: Verify Frontend Session (Browser Console)

After landing back on `/settings`, open Console and run:

```javascript
// 1. Check stored session
const session = JSON.parse(localStorage.getItem('activeBrokerSession'));
console.log('📦 Stored Session:', session);

// 2. Expected output:
{
  config_id: "d2451ed9-...",  // Your config ID
  user_id: "EBW183",           // Zerodha user ID
  broker_name: "zerodha",
  session_status: "connected",
  needs_reauth: false,         // ← Should be FALSE!
  connection_status: {
    state: "connected",
    message: "Successfully authenticated",
    lastChecked: "2025-09-30T..."
  }
}

// 3. Check individual keys (for legacy compatibility)
console.log('Config ID:', localStorage.getItem('zerodha_config_id'));
console.log('User ID:', localStorage.getItem('zerodha_user_id'));
console.log('Needs Reauth:', localStorage.getItem('zerodha_needs_reauth'));
```

**Expected Results:**
- ✅ `session_status`: `"connected"`
- ✅ `needs_reauth`: `false`
- ✅ `config_id`: Present (UUID format)
- ✅ `user_id`: `"EBW183"`

---

### Step 5: Verify Backend Token Storage

Copy the `config_id` from Step 4, then run (replace `<CONFIG_ID>`):

```bash
# Check session endpoint
curl "https://web-production-de0bc.up.railway.app/api/modules/auth/broker/session?config_id=<CONFIG_ID>" | python3 -m json.tool

# Expected output:
{
  "status": "success",
  "data": {
    "id": "<CONFIG_ID>",
    "broker_name": "zerodha",
    "is_connected": true,
    "access_token": "xxxxxxxxxxxx",      # ← Should be present!
    "refresh_token": null,                # ← Zerodha doesn't provide
    "user_data": {
      "user_id": "EBW183",               # ← Should be present!
      "user_name": "...",
      "user_type": "individual",
      "email": "..."
    },
    "token_status": {
      "status": "valid",                  # ← Should be "valid"!
      "needsReauth": false,               # ← Should be false!
      "expiresAt": "2025-10-01T..."
    },
    "connection_status": {
      "state": "connected",
      "message": "Successfully connected to Zerodha",
      "lastChecked": "2025-09-30T..."
    }
  }
}
```

**Critical Checks:**
- ✅ `access_token`: **NOT NULL** (should be a long string)
- ✅ `user_data.user_id`: `"EBW183"`
- ✅ `token_status.status`: `"valid"`
- ✅ `token_status.needsReauth`: `false`
- ✅ `is_connected`: `true`

---

### Step 6: Verify Status Endpoint

```bash
# Check status by config_id
curl "https://web-production-de0bc.up.railway.app/api/modules/auth/broker/status?config_id=<CONFIG_ID>" | python3 -m json.tool

# Check status by user_id (Zerodha user)
curl "https://web-production-de0bc.up.railway.app/api/modules/auth/broker/status?user_id=EBW183" | python3 -m json.tool
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "needsReauth": false,        # ← KEY: Should be FALSE!
    "connectionStatus": {
      "state": "connected"
    },
    "tokenStatus": {
      "status": "valid",
      "needsReauth": false
    }
  }
}
```

---

### Step 7: Test Portfolio Fetch

On the `/settings` page, UI should now show:
- ✅ Green "Connected" badge
- ✅ "Fetch Live Portfolio Snapshot" button **enabled**
- ❌ NO "Needs Reconnect" banner

Click **"Fetch Live Portfolio Snapshot"**:

```bash
# Backend will call:
POST /api/modules/auth/broker/portfolio/fetch
{
  "config_id": "<CONFIG_ID>"
}

# Expected response:
{
  "success": true,
  "data": {
    "holdings": [...],
    "positions": [...],
    "totalValue": 123456.78,
    "lastUpdated": "2025-09-30T..."
  }
}
```

---

## 🔍 Troubleshooting

### If tokens are still missing:

1. **Check OAuth callback logs:**
   ```bash
   # On Railway dashboard, check Deploy Logs for:
   # "✅ Token stored successfully"
   # "✅ OAuth callback completed"
   ```

2. **Check database directly (if you have access):**
   ```sql
   SELECT config_id, user_id, broker_user_id, 
          access_token_encrypted IS NOT NULL as has_token,
          expires_at, status
   FROM oauth_tokens
   WHERE config_id = '<CONFIG_ID>';
   ```

3. **Force reconnect:**
   ```bash
   curl -X POST "https://web-production-de0bc.up.railway.app/api/modules/auth/broker/reconnect" \
     -H "Content-Type: application/json" \
     -d '{"config_id": "<CONFIG_ID>"}'
   ```

### If frontend shows "Needs Reconnect":

1. **Check localStorage:**
   ```javascript
   const session = JSON.parse(localStorage.getItem('activeBrokerSession'));
   console.log('needs_reauth:', session?.needs_reauth);
   ```

2. **Manually reset frontend state:**
   ```javascript
   const session = JSON.parse(localStorage.getItem('activeBrokerSession'));
   session.needs_reauth = false;
   session.session_status = 'connected';
   localStorage.setItem('activeBrokerSession', JSON.stringify(session));
   location.reload();
   ```

3. **Verify `useBrokerSession` hook is loading correctly:**
   - Check browser console for any errors
   - Verify `brokerSessionStore.js` is importing correctly

---

## ✅ Success Criteria

All of these must pass:

- [ ] Backend returns `access_token` (not null)
- [ ] Backend returns `user_data.user_id = "EBW183"`
- [ ] Backend `needsReauth = false`
- [ ] Frontend localStorage has `activeBrokerSession`
- [ ] Frontend shows "Connected" (green badge)
- [ ] Portfolio fetch succeeds
- [ ] No console errors

---

## 📊 Post-Test Report Template

After completing the test, document results:

```markdown
## Authentication Test Results
**Date:** 2025-09-30
**Tester:** [Your Name]

### Results:
- OAuth Flow: ✅ / ❌
- Token Storage: ✅ / ❌
- Frontend Session: ✅ / ❌
- Portfolio Fetch: ✅ / ❌

### Backend Session Data:
```json
[paste curl result from Step 5]
```

### Frontend Session Data:
```json
[paste console output from Step 4]
```

### Issues Found:
[List any issues]

### Screenshots:
[Attach screenshot of /settings page showing connection status]
```

---

**Ready to test!** 🚀

Let me know the results after you complete Steps 1-7.


