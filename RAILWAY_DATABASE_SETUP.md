# Railway PostgreSQL Database Setup Guide

## 🚀 Step 1: Create PostgreSQL Database on Railway

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select Your Project**: `QuantumTrade_Backend`
3. **Add Database Service**:
   - Click "New Service" → "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL database

## 🔧 Step 2: Get Database Connection Details

After the database is created, Railway will provide:
- **Database URL**: `postgresql://username:password@host:port/database`
- **Host**: The database server hostname
- **Port**: Usually 5432
- **Username**: Auto-generated username
- **Password**: Auto-generated password
- **Database Name**: Auto-generated database name

## 🌍 Step 3: Add Environment Variable

1. **Go to Variables Tab** in your Railway backend service
2. **Add New Variable**:
   ```
   Name: DATABASE_URL
   Value: postgresql://username:password@host:port/database
   ```
   (Use the connection string provided by Railway)

## 📋 Step 4: Verify Database Setup

The application will automatically:
1. **Connect to the database** on startup
2. **Run migrations** to create all required tables
3. **Verify table structure** for OAuth functionality

## 🔍 Step 5: Monitor Database Health

You can check database status via:
- **Health Endpoint**: `GET /health` (includes database status)
- **OAuth Health**: `GET /api/modules/auth/broker/health`
- **Railway Logs**: Monitor connection status in deployment logs

## 📊 Database Schema Overview

The database includes these main tables:

### Core Tables:
- **`users`**: User authentication and profiles
- **`user_sessions`**: Session management
- **`system_config`**: Application configuration

### OAuth Tables:
- **`broker_configs`**: Encrypted broker API credentials
- **`oauth_tokens`**: Encrypted OAuth access/refresh tokens
- **`oauth_audit_log`**: Security audit trail

### Trading Tables:
- **`portfolios`**: User portfolios
- **`holdings`**: Portfolio holdings
- **`trades`**: Trading history and orders
- **`market_data`**: Cached market data

## 🔐 Security Features

- **Encryption**: All sensitive data (API keys, tokens) encrypted at rest
- **Audit Logging**: Complete OAuth operation audit trail
- **Connection Pooling**: Optimized database connections
- **Automatic Migrations**: Schema updates handled automatically

## 🚨 Troubleshooting

### Connection Issues:
1. **Check DATABASE_URL**: Ensure the connection string is correct
2. **Network Access**: Railway databases are accessible from Railway services by default
3. **SSL Configuration**: Production uses SSL, development doesn't

### Migration Issues:
1. **Check Logs**: Look for migration errors in Railway logs
2. **Manual Migration**: Connect to database and run schema.sql manually if needed
3. **Table Verification**: Use health endpoints to verify table creation

## 📝 Next Steps After Database Setup

1. **Deploy Backend**: Push changes to trigger Railway deployment
2. **Test OAuth Flow**: Verify OAuth endpoints work with database
3. **Monitor Performance**: Check database performance in Railway dashboard
4. **Scale if Needed**: Upgrade database plan if performance issues occur

## 🔗 Useful Railway Database Commands

```bash
# Connect to Railway database (if Railway CLI is installed)
railway connect

# View database logs
railway logs --service=postgresql

# Get database connection info
railway variables
```

## 📈 Database Monitoring

Railway provides built-in monitoring for:
- **Connection Count**: Active database connections
- **Query Performance**: Slow query identification
- **Storage Usage**: Database size and growth
- **Memory Usage**: Database memory consumption

Monitor these metrics in the Railway dashboard under your PostgreSQL service.