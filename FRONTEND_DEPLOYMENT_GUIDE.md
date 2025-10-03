# Frontend Deployment Guide - Railway

## Manual Redeploy Procedure

### When Frontend Auto-Deploy Fails

If Railway doesn't automatically deploy the latest frontend code:

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select Frontend Service**: `quantum-leap-frontend`
3. **Navigate to**: "Deployments" tab
4. **Click**: "Deploy" or "Redeploy" button
   - Ensure deploying from: `main` branch
   - Latest commit should match: `git log -1 --oneline`
5. **RECOMMENDED**: "Clear Cache and Redeploy"
   - Click "..." menu on deployment
   - Select "Clear Cache and Redeploy"
   - Prevents old build artifacts from persisting
6. **Wait**: 3-5 minutes for build and deployment

---

## Verify Deployment Success

### 1. Check Version Endpoint

```bash
curl https://quantum-leap-frontend-production.up.railway.app/version.json | jq
```

**Expected Response**:
```json
{
  "service": "quantum-leap-frontend",
  "commit": "308ac25",  // ← Should show actual commit SHA
  "githubSha": "",
  "buildTime": "2025-10-03T...",  // ← Should be recent
  "nodeVersion": "v18.20.8",
  "npmVersion": "10.8.2",
  "status": "ROCK_SOLID_CERTIFIED"
}
```

**✅ Success Indicators**:
- `commit`: Shows actual SHA (not "unknown")
- `buildTime`: Recent timestamp (not hours/days old)

**❌ If commit shows "unknown"**:
- Railway not injecting `RAILWAY_GIT_COMMIT_SHA`
- Try "Clear Cache and Redeploy"
- Check Railway Variables tab

### 2. Check Railway Startup Logs

In Railway deployment logs, look for:
```
🚀 Frontend started on port 80 (commit=308ac25)
📝 Build time: 2025-10-03T...
```

**Key indicators**:
- Commit SHA displayed in startup log
- Recent build time
- Port binding successful (80 or Railway's assigned port)

### 3. Verify Frontend Accessibility

```bash
curl -I https://quantum-leap-frontend-production.up.railway.app
```

**Expected**:
```
HTTP/2 200
content-type: text/html
...
```

### 4. Integration Test with Backend

**Test AI Validation Endpoint Integration**:
1. Open browser: https://quantum-leap-frontend-production.up.railway.app
2. Go to "AI Configuration" page
3. Enter a test OpenAI API key
4. Click "Test" button

**Expected**:
- ✅ Request goes to: `https://web-production-de0bc.up.railway.app/api/ai/validate-key`
- ✅ Returns: `{"valid": false, "message": "Invalid OpenAI API key"}` (if key is invalid)
- ✅ No CORS errors in browser console
- ✅ No 404 errors

**Check Browser Console**:
```javascript
// Should see logs like:
🚀 [RailwayAPI] POST https://web-production-de0bc.up.railway.app/api/ai/validate-key
✅ [RailwayAPI] Success
```

---

## Common Issues and Solutions

### Issue: Version Shows "unknown" Commit

**Cause**: Railway not injecting commit SHA build argument

**Solution**:
1. Check Railway **Variables** tab
2. `RAILWAY_GIT_COMMIT_SHA` should be auto-provided
3. If not, add manually:
   - Name: `COMMIT_SHA`
   - Value: `${{RAILWAY_GIT_COMMIT_SHA}}`
4. Redeploy

### Issue: Old Build Time (Hours/Days Old)

**Cause**: Railway using cached build, not rebuilding

**Solution**:
1. Go to Deployments → "..." menu
2. Select **"Clear Cache and Redeploy"**
3. Wait for complete rebuild
4. Verify new `buildTime` in `/version.json`

### Issue: Frontend Not Calling Backend Correctly

**Symptoms**:
- 404 errors on `/api/ai/validate-key`
- CORS errors
- "Route not found" messages

**Solution**:
1. Verify backend is deployed: 
   ```bash
   curl https://web-production-de0bc.up.railway.app/health
   # Should return: {"status":"ok","commit":"5406796","version":"2.1.0",...}
   ```
2. Clear browser cache: Ctrl+Shift+Delete
3. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. Clear localStorage:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### Issue: Session user_id is null

**Cause**: Old session data from before backend fix

**Solution**:
1. Clear localStorage: `localStorage.clear()`
2. Go to "Broker Integration"
3. Reconnect to Zerodha
4. Complete OAuth flow
5. New session will have `user_id` populated

---

## Deployment Checklist

Use this after Railway deployment completes:

- [ ] `/version.json` shows actual commit SHA (not "unknown")
- [ ] `/version.json` shows recent `buildTime` (not hours old)
- [ ] Railway logs show: `🚀 Frontend started on port X (commit=SHA)`
- [ ] Frontend page loads successfully
- [ ] AI Configuration page accessible
- [ ] Backend API calls work (no 404/CORS errors)
- [ ] Browser console shows no errors
- [ ] Session handling works (after localStorage clear + reconnect)

---

## Railway Configuration

### Required Settings

**Service Name**: `quantum-leap-frontend`

**Build Command**: 
```bash
npm run build
```

**Dockerfile**: Yes (uses custom Dockerfile)

**Port**: Automatically assigned by Railway (bind to `$PORT`)

**Branch**: `main`

**Auto-Deploy**: Should be enabled

### Build Arguments (Automatic)

Railway automatically provides:
- `RAILWAY_GIT_COMMIT_SHA` - Current commit SHA
- `RAILWAY_GIT_BRANCH` - Branch name
- `RAILWAY_GIT_AUTHOR` - Commit author

Our Dockerfile uses these for version tracking.

### Health Check

Railway checks if the service responds on the assigned `PORT`.
- Path: `/` (serves index.html)
- Timeout: 300 seconds
- Interval: 30 seconds

---

## Post-Deployment User Actions

After successful frontend deployment:

### 1. Clear Browser Storage
```javascript
// In browser DevTools Console (F12):
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Verify Session Schema
After clearing and reconnecting to Zerodha:
```javascript
// In browser Console:
const session = JSON.parse(localStorage.getItem('activeBrokerSession'));
console.log('Session:', session);
// Should show: { config_id: "...", user_id: "EBW183", ... }
```

### 3. Test AI Configuration
1. Go to AI Configuration page
2. Enter OpenAI API key
3. Click "Test"
4. Should validate successfully (or show clear error for invalid key)
5. No 404 or CORS errors

---

**Last Updated**: October 3, 2025  
**Latest Commit**: `308ac25`  
**Expected Version**: Commit SHA visible in `/version.json`  
**Backend Dependency**: Version 2.1.0 (commit 5406796)
