# Web-Based Database Verification Guide

## 🎯 **Since CLI commands aren't available, let's verify through web endpoints**

### **Step 1: Check Overall Application Health**
Open this URL in your browser:
```
https://web-production-de0bc.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "database": {
    "status": "connected",
    "stats": {...}
  }
}
```

### **Step 2: Check Auth Module Status**
```
https://web-production-de0bc.up.railway.app/api/modules/auth/debug
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "name": "auth",
    "version": "2.0.0",
    "status": "initialized"
  }
}
```

### **Step 3: Check OAuth Database Health**
```
https://web-production-de0bc.up.railway.app/api/modules/auth/broker/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "status": "connected"
  },
  "stats": {
    "brokerConfigs": 0,
    "oauthTokens": 0
  }
}
```

### **Step 4: Check OAuth Service Status**
```
https://web-production-de0bc.up.railway.app/api/modules/auth/broker/status
```

**Expected Response:**
```json
{
  "success": true,
  "oauth": {
    "status": "ready",
    "database": "connected",
    "encryption": "enabled"
  }
}
```

---

## 🚨 **What to Look For:**

### ✅ **Success Indicators:**
- All endpoints return HTTP 200 status
- Database status shows "connected"
- No error messages in responses
- OAuth services show "ready" or "initialized"

### ❌ **Failure Indicators:**
- HTTP 500 errors
- Database status shows "disconnected" or "error"
- Missing environment variables warnings
- Connection timeout errors

---

## 📋 **Verification Checklist:**

- [ ] `/health` endpoint returns healthy status
- [ ] `/api/modules/auth/debug` shows auth module loaded
- [ ] `/api/modules/auth/broker/health` shows database connected
- [ ] `/api/modules/auth/broker/status` shows OAuth ready
- [ ] No error messages in any responses
- [ ] Database tables created automatically (shown in stats)

---

## 🎉 **If All Tests Pass:**

Your database setup is complete! You can now:

1. **Test OAuth Flow**: Visit the Zerodha connection endpoint
2. **Monitor Database**: Check Railway dashboard for database metrics
3. **Start Using Features**: OAuth integration is fully operational

---

## 🔧 **If Tests Fail:**

1. **Check Railway Logs**: Go to your backend service → Deployments → View logs
2. **Verify Environment Variables**: Ensure `DATABASE_URL` is set correctly
3. **Check Database Service**: Ensure PostgreSQL service is active in Railway
4. **Restart Services**: Try redeploying your backend service
