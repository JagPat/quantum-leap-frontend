# Railway PostgreSQL Database Setup - Step by Step Guide

## 🎯 **Overview**
This guide will walk you through setting up a PostgreSQL database on Railway for your QuantumLeap Trading Backend.

## 📋 **Prerequisites**
- Railway account with your backend project deployed
- Access to your Railway dashboard
- Your backend project should be named something like `quantumleap-trading-backend`

---

## 🚀 **Step 1: Access Railway Dashboard**

1. **Open Railway Dashboard**
   - Go to: https://railway.app/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Look for your backend project (likely named `quantumleap-trading-backend` or similar)
   - Click on the project to open it

---

## 🗄️ **Step 2: Add PostgreSQL Database Service**

1. **Add New Service**
   - In your project dashboard, click the **"+ New"** button
   - Select **"Database"** from the dropdown menu
   - Choose **"Add PostgreSQL"**

2. **Database Provisioning**
   - Railway will automatically start provisioning your PostgreSQL database
   - This usually takes 1-2 minutes
   - You'll see a new service appear in your project with a PostgreSQL icon

3. **Wait for Deployment**
   - The database service will show "Deploying..." initially
   - Wait until it shows "Active" or "Deployed" status
   - The database is ready when you see a green checkmark

---

## 🔗 **Step 3: Get Database Connection Details**

1. **Click on PostgreSQL Service**
   - Click on the PostgreSQL service box in your project dashboard
   - This opens the database service details

2. **Go to Variables Tab**
   - Click on the **"Variables"** tab
   - You'll see several database connection variables

3. **Copy DATABASE_URL**
   - Look for the variable named **`DATABASE_URL`**
   - Click the **copy icon** next to it
   - This is your complete PostgreSQL connection string
   - It looks like: `postgresql://username:password@host:port/database`

---

## ⚙️ **Step 4: Add DATABASE_URL to Backend Service**

1. **Go Back to Project Dashboard**
   - Click the back arrow or project name to return to main project view

2. **Select Your Backend Service**
   - Click on your backend service (the one running your Node.js app)
   - This is usually the service that's NOT the PostgreSQL database

3. **Open Variables Tab**
   - Click on the **"Variables"** tab in your backend service

4. **Add DATABASE_URL Variable**
   - Click **"New Variable"**
   - **Variable Name**: `DATABASE_URL`
   - **Variable Value**: Paste the connection string you copied from Step 3
   - Click **"Add"**

---

## 🚀 **Step 5: Deploy and Verify**

1. **Automatic Deployment**
   - Railway will automatically redeploy your backend service
   - This happens when you add the new environment variable
   - Wait for the deployment to complete (usually 2-3 minutes)

2. **Check Deployment Status**
   - Watch the deployment logs in the **"Deployments"** tab
   - Look for successful deployment indicators
   - The service should show "Active" status when ready

---

## 🧪 **Step 6: Verify Database Setup**

1. **Run Verification Script**
   ```bash
   node verify-database-setup.cjs
   ```

2. **Expected Output**
   ```
   🔍 Database Setup Verification
   ================================
   🌐 Backend URL: https://your-app.up.railway.app
   
   🧪 Testing: Application Health Check
      ✅ SUCCESS
   
   🧪 Testing: OAuth Database Health
      ✅ SUCCESS
   
   📋 Test Summary
   ===============
   ✅ Passed: 4/4
   🎉 All tests passed! Database setup is working correctly.
   ```

3. **Check Database Tables**
   - Your application will automatically create all required tables
   - Tables include: `users`, `broker_configs`, `oauth_tokens`, etc.

---

## 🔍 **Step 7: Monitor Database Health**

1. **Health Check Endpoints**
   - **Overall Health**: `https://your-app.up.railway.app/health`
   - **OAuth Health**: `https://your-app.up.railway.app/api/modules/auth/broker/health`

2. **Railway Database Monitoring**
   - Go to your PostgreSQL service in Railway dashboard
   - Check the **"Metrics"** tab for:
     - Connection count
     - Query performance
     - Storage usage
     - Memory usage

---

## 🚨 **Troubleshooting**

### **Issue: Database Connection Failed**
**Solution:**
1. Verify `DATABASE_URL` is correctly copied
2. Check that both services are in the same Railway project
3. Ensure PostgreSQL service is "Active"

### **Issue: Tables Not Created**
**Solution:**
1. Check backend deployment logs for migration errors
2. Verify all environment variables are set
3. Restart the backend service

### **Issue: OAuth Endpoints Not Working**
**Solution:**
1. Ensure all variables from `RAILWAY_ENV_SETUP_COMPLETE.md` are set
2. Check that `OAUTH_ENCRYPTION_KEY` is properly configured
3. Verify database connection is successful

---

## 📊 **Database Schema Overview**

Once setup is complete, your database will have these tables:

### **Core Tables:**
- `users` - User authentication and profiles
- `user_sessions` - Session management
- `system_config` - Application configuration

### **OAuth Tables:**
- `broker_configs` - Encrypted broker API credentials
- `oauth_tokens` - Encrypted OAuth access/refresh tokens  
- `oauth_audit_log` - Security audit trail

### **Trading Tables:**
- `portfolios` - User portfolios
- `holdings` - Portfolio holdings
- `trades` - Trading history and orders
- `market_data` - Cached market data

---

## ✅ **Success Checklist**

- [ ] PostgreSQL service created and active
- [ ] `DATABASE_URL` copied from PostgreSQL service
- [ ] `DATABASE_URL` added to backend service variables
- [ ] Backend service redeployed successfully
- [ ] Verification script passes all tests
- [ ] Health endpoints return success
- [ ] Database tables created automatically

---

## 🎉 **Next Steps After Setup**

1. **Test OAuth Flow**
   - Visit: `https://your-app.up.railway.app/api/modules/auth/broker/connect/zerodha`
   - This should initiate the Zerodha OAuth flow

2. **Monitor Performance**
   - Check Railway dashboard metrics
   - Monitor application logs
   - Watch database connection counts

3. **Scale if Needed**
   - Upgrade database plan if you hit limits
   - Monitor query performance
   - Consider connection pooling optimizations

---

**🎯 You're now ready with a production PostgreSQL database!**

Your QuantumLeap Trading Platform now has persistent, encrypted storage for all OAuth tokens and broker configurations.