# Verification Guide - After Deployment

## Wait for Deployment (3-5 minutes)

1. Frontend deploying to Vercel/Railway
2. Backend already deployed (commit ea63383)

---

## Step 1: Hard Refresh Browser

- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

This clears cached JavaScript and loads the new version.

---

## Step 2: Verify Broker Connection

Go to: **Settings > Broker Integration**

### Expected Result:
- ✅ Status shows: "**Connected**" (green badge)
- ✅ "Connected to: **zerodha**"
- ✅ "Last Sync" shows recent timestamp

---

## Step 3: Test Portfolio Fetch

Click: **"Fetch Live Data"** button

### Expected Result:
- ✅ Success toast: "**Live portfolio loaded**"
- ✅ Portfolio data displays below (holdings, positions, summary)
- ❌ NO "Portfolio fetch failed" error

### If it still fails:
Open browser console (F12) and look for error messages. Share the console output.

---

## Step 4: Verify AI Configuration

Go to: **AI Configuration** page (or Settings > AI)

### Expected Result:
- ✅ NO "Please connect to your broker" warning
- ✅ Page shows "authenticated" state
- ✅ API key fields are enabled and editable
- ✅ You can input OpenAI/Claude/Gemini API keys
- ✅ "Test" buttons next to each API key field are enabled

### If still showing "not authenticated":

**Run this in browser console (F12):**

```javascript
// Check what's in localStorage
const session = localStorage.getItem('activeBrokerSession');
console.log('Session exists:', !!session);
if (session) {
  const parsed = JSON.parse(session);
  console.log('Session status:', parsed.session_status);
  console.log('Config ID:', parsed.config_id);
  console.log('User ID:', parsed.user_data?.user_id);
}

// Force reload the AI page
window.location.reload();
```

---

## Step 5: Check Backend Health (Optional)

**Open in new tab:**
```
https://web-production-de0bc.up.railway.app/api/modules/auth/broker/health
```

### Expected Response:
```json
{
  "status": "healthy",
  "service": "broker-oauth",
  "timestamp": "...",
  "database": "connected"
}
```

---

## Common Issues & Solutions

### Issue 1: Portfolio still fails after deployment

**Solution:**
- Wait 5 full minutes for deployment
- Clear ALL browser cache (not just hard refresh)
- Try in incognito/private mode

### Issue 2: AI page still shows "connect broker"

**Solution:**
- Check browser console for the session (see Step 4 above)
- If session exists but page doesn't recognize it:
  - The AI page JavaScript might be cached
  - Try: `localStorage.clear()` in console, then reconnect broker

### Issue 3: "Invalid config_id" or "User not found"

**Solution:**
- Disconnect broker: Click "Disconnect Broker" button
- Reconnect: Click "Connect Broker" and complete OAuth flow
- This will create a fresh session with correct IDs

---

## After Verification

If everything works:
- ✅ Portfolio fetch: Working
- ✅ AI Configuration: Accessible
- ✅ Broker status: Connected

You're all set! You can now:
1. Configure your AI API keys (OpenAI, Claude, or Gemini)
2. Test AI features
3. Use the full trading platform

---

## Still Having Issues?

**Share these with me:**

1. Browser console errors (F12 > Console tab)
2. Network tab errors (F12 > Network tab, filter by "broker" or "portfolio")
3. Screenshot of the error message
4. Output of the localStorage check script from Step 4

I'll help debug further!



