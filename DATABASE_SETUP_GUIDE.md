# 🗄️ Database Setup Guide for QuantumLeap Trading Backend

## 📋 **Overview**

This guide will help you set up a PostgreSQL database for the QuantumLeap Trading Backend on Railway.

## 🚀 **Step 1: Create PostgreSQL Database on Railway**

### **Option A: Using Railway Dashboard**
1. Go to your Railway project dashboard
2. Click **"+ New Service"**
3. Select **"Database"** → **"PostgreSQL"**
4. Railway will automatically create a PostgreSQL database
5. Note down the connection details

### **Option B: Using Railway CLI**
```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Add PostgreSQL database to your project
railway add postgresql
```

## 🔧 **Step 2: Get Database Connection String**

After creating the database, Railway will provide you with connection details:

1. Go to your PostgreSQL service in Railway dashboard
2. Click on **"Variables"** tab
3. Copy the **`DATABASE_URL`** value

The format will be:
```
postgresql://postgres:password@host:port/database
```

## 🌍 **Step 3: Set Environment Variables**

Add the following environment variable to your **backend service** (not the database service):

### **Required Variable:**
```bash
DATABASE_URL=postgresql://postgres:password@host:port/database
```

### **Optional Variables (for fine-tuned control):**
```bash
# Individual database components (if not using DATABASE_URL)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-password

# Database behavior
REQUIRE_DATABASE=true  # Set to 'true' in production to fail if DB unavailable
```

## 🔄 **Step 4: Deploy and Verify**

1. **Deploy the backend** with the new environment variables
2. **Check the logs** for successful database initialization:
   ```
   ✅ Database connection established successfully
   ✅ Database initialized with all migrations
   ```

3. **Verify database tables** were created by checking the health endpoint:
   ```bash
   curl https://your-backend-url/health
   ```

## 📊 **Step 5: Database Schema**

The system will automatically create these tables:

### **Core Tables:**
- `users` - User management
- `otps` - OTP authentication
- `migrations` - Database version tracking

### **OAuth Tables:**
- `broker_configs` - Broker API configurations
- `oauth_tokens` - Encrypted OAuth tokens
- `oauth_audit_log` - Security audit trail

### **Portfolio Tables (Future):**
- `portfolios` - Trading portfolios
- `holdings` - Stock holdings
- `trades` - Trading history

## 🔍 **Step 6: Verify OAuth Integration**

After database setup, test the OAuth endpoints:

```bash
# Test OAuth setup (should work without 500 errors)
curl -X POST https://your-backend-url/api/modules/auth/broker/setup-oauth \
  -H "Content-Type: application/json" \
  -d '{"api_key":"test_key_123456","api_secret":"test_secret_123456789","user_id":"test_user"}'

# Should return OAuth URL instead of database error
```

## 🛠️ **Troubleshooting**

### **Database Connection Issues:**
1. **Check environment variables** are set correctly
2. **Verify DATABASE_URL** format is correct
3. **Check Railway logs** for connection errors
4. **Ensure database service** is running in Railway

### **Migration Issues:**
1. **Check database permissions** - user should have CREATE/ALTER rights
2. **Verify PostgreSQL version** - should be 12+ for UUID support
3. **Check logs** for specific migration errors

### **OAuth Still Not Working:**
1. **Restart the backend service** after adding DATABASE_URL
2. **Check logs** for "Database initialized with all migrations"
3. **Verify tables exist** using Railway's database console

## 🎯 **Expected Results**

After successful setup:

✅ **Database Connection**: No more "Database connection not initialized" errors  
✅ **OAuth Endpoints**: All OAuth operations work with persistent storage  
✅ **Data Persistence**: User configurations survive server restarts  
✅ **Security**: API keys and tokens are encrypted in database  
✅ **Audit Trail**: All OAuth operations are logged for security  

## 🔐 **Security Notes**

- **API secrets** are encrypted before storage
- **OAuth tokens** are encrypted with AES-256
- **Database connection** uses SSL in production
- **Audit logging** tracks all OAuth operations
- **No sensitive data** appears in application logs

## 📈 **Next Steps**

Once database is working:
1. **Test OAuth flow** end-to-end from frontend
2. **Add user management** features
3. **Implement portfolio** data storage
4. **Add trading history** tracking
5. **Set up automated backups** in Railway

---

**Need help?** Check the Railway logs or create an issue with the error details.