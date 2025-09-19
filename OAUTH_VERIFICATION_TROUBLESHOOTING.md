# OAuth Verification Troubleshooting Guide

## Table of Contents
1. [Quick Diagnosis](#quick-diagnosis)
2. [Database Issues](#database-issues)
3. [OAuth Endpoint Problems](#oauth-endpoint-problems)
4. [Security Verification Failures](#security-verification-failures)
5. [Frontend Integration Issues](#frontend-integration-issues)
6. [Performance Problems](#performance-problems)
7. [Monitoring and Alerting Issues](#monitoring-and-alerting-issues)
8. [Environment-Specific Problems](#environment-specific-problems)
9. [Error Code Reference](#error-code-reference)
10. [Recovery Procedures](#recovery-procedures)

## Quick Diagnosis

### Step 1: Run Basic Health Check
```bash
# Quick system health check
node oauth-verify-cli-v2.cjs health --verbose
```

**Expected Output**: All health checks should pass with 200 status codes.

**If this fails**: Your system has fundamental connectivity or deployment issues.

### Step 2: Check System Status
```bash
# Check overall system status
node oauth-verify-cli-v2.cjs --tests health,database,oauth
```

**Expected Output**: At least health and oauth should pass.

**If multiple tests fail**: Likely a deployment or configuration issue.

### Step 3: Verify Configuration
```bash
# Check monitoring configuration
node monitoring-config-helper.cjs summary
```

**Expected Output**: Configuration should show correct URL and enabled tests.

## Database Issues

### Issue: "Database connection not initialized"

**Symptoms**:
```
❌ FAIL: Database Connection Pool
📊 Error: Database connection not initialized
```

**Root Cause**: Missing or incorrect DATABASE_URL environment variable.

**Diagnosis Steps**:
```bash
# 1. Check database verification specifically
node oauth-verify-cli-v2.cjs database --verbose

# 2. Run Railway deployment verification
node oauth-verify-cli-v2.cjs railway --verbose

# 3. Use database connectivity diagnostic
node fix-database-connectivity.cjs
```

**Solutions**:

#### Solution 1: Fix DATABASE_URL in Railway
1. **Go to Railway Dashboard**:
   - Navigate to your project
   - Click on your backend service
   - Go to "Variables" tab

2. **Add DATABASE_URL**:
   ```
   Variable Name: DATABASE_URL
   Variable Value: postgresql://postgres:password@host:port/database
   ```

3. **Get the correct URL**:
   - Go to your PostgreSQL service in Railway
   - Copy the "Database URL" from the Connect tab
   - Paste it as the DATABASE_URL variable value

4. **Redeploy**:
   - Railway will automatically redeploy with the new variable
   - Wait for deployment to complete

#### Solution 2: Use Automated Fix
```bash
# Run the automated database fix
node fix-and-verify-db-connection.cjs

# Follow the generated guide
cat RAILWAY_DATABASE_FIX_GUIDE.md
```

#### Solution 3: Manual Database Setup
```bash
# Check database schema
node verify-database-schema.cjs

# Fix database schema if needed
node fix-database-schema.cjs
```

**Verification**:
```bash
# Verify the fix worked
node oauth-verify-cli-v2.cjs database
```

### Issue: "Query execution failed"

**Symptoms**:
```
❌ FAIL: Query Execution Capability
📊 Error: relation "oauth_tokens" does not exist
```

**Root Cause**: Database schema not properly initialized.

**Solutions**:

#### Solution 1: Initialize Database Schema
```bash
# Run schema initialization
node fix-database-schema.cjs
```

#### Solution 2: Manual Schema Creation
Connect to your PostgreSQL database and run:
```sql
-- Create oauth_tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    api_key VARCHAR(255) NOT NULL,
    encrypted_secret TEXT NOT NULL,
    state VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create broker_configs table
CREATE TABLE IF NOT EXISTS broker_configs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    broker_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    encrypted_secret TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

### Issue: High Database Response Times

**Symptoms**:
```
⚠️ WARNING: Database Connection Pool
📊 Average Response Time: 8500ms (threshold: 5000ms)
```

**Solutions**:

#### Solution 1: Optimize Connection Pool
Add to your application configuration:
```javascript
// Database connection pool optimization
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,          // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

#### Solution 2: Database Performance Tuning
```sql
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_state ON oauth_tokens(state);
CREATE INDEX IF NOT EXISTS idx_broker_configs_user_id ON broker_configs(user_id);
```

## OAuth Endpoint Problems

### Issue: "OAuth endpoint returning 404"

**Symptoms**:
```
❌ FAIL: OAuth Endpoint Verification
📊 Status: 404 Not Found
```

**Root Cause**: OAuth routes not properly configured or deployed.

**Diagnosis Steps**:
```bash
# 1. Check endpoint availability
curl -I https://your-app.railway.app/api/auth/broker/setup-oauth

# 2. Test with verbose output
node oauth-verify-cli-v2.cjs oauth --verbose

# 3. Check Railway deployment
node oauth-verify-cli-v2.cjs railway --verbose
```

**Solutions**:

#### Solution 1: Verify Route Configuration
Check your backend routing configuration:
```javascript
// Ensure OAuth routes are properly registered
app.use('/api/auth/broker', oauthRoutes);

// Verify the route handler exists
router.post('/setup-oauth', async (req, res) => {
    // OAuth setup logic
});
```

#### Solution 2: Check Deployment Status
```bash
# Verify latest code is deployed
git log --oneline -5
# Compare with Railway deployment logs
```

#### Solution 3: Test Route Manually
```bash
# Test the endpoint directly
curl -X POST https://your-app.railway.app/api/auth/broker/setup-oauth \
  -H "Content-Type: application/json" \
  -d '{"api_key":"test","api_secret":"test"}'
```

### Issue: "Invalid request data" errors

**Symptoms**:
```
❌ FAIL: OAuth Request Processing
📊 Error: Invalid request data - "api_key" is required
```

**Root Cause**: Request validation is working correctly, but test data is invalid.

**Solutions**:

#### Solution 1: Use Valid Test Data
```bash
# Generate proper test data
node test-data-management.cjs setup

# Run tests with generated data
node test-data-integration.cjs run-suite
```

#### Solution 2: Check Validation Rules
Verify your validation schema:
```javascript
// Example validation schema
const oauthSchema = {
    api_key: { type: 'string', required: true, minLength: 1 },
    api_secret: { type: 'string', required: true, minLength: 1 },
    user_id: { type: 'string', required: false }
};
```

### Issue: OAuth flow not completing

**Symptoms**:
```
❌ FAIL: End-to-End OAuth Verification
📊 Error: OAuth callback not processed
```

**Solutions**:

#### Solution 1: Check Callback URL Configuration
```javascript
// Ensure callback URL is properly configured
const callbackUrl = `${process.env.FRONTEND_URL}/oauth/callback`;
```

#### Solution 2: Verify State Parameter Handling
```javascript
// Proper state parameter handling
const state = crypto.randomBytes(32).toString('hex');
// Store state in database
// Verify state in callback
```

## Security Verification Failures

### Issue: "Missing security headers"

**Symptoms**:
```
❌ FAIL: Security Headers Verification
📊 Missing: X-Frame-Options, X-Content-Type-Options
```

**Solutions**:

#### Solution 1: Add Security Middleware
```javascript
// Add helmet middleware for security headers
const helmet = require('helmet');
app.use(helmet({
    frameguard: { action: 'deny' },
    contentTypeOptions: { nosniff: true },
    hsts: { maxAge: 31536000 }
}));
```

#### Solution 2: Manual Header Configuration
```javascript
// Manual security headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    next();
});
```

### Issue: "HTTPS not enforced"

**Symptoms**:
```
❌ FAIL: HTTPS Enforcement
📊 Error: HTTP connections allowed
```

**Solutions**:

#### Solution 1: Force HTTPS Redirect
```javascript
// Force HTTPS in production
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});
```

#### Solution 2: Railway HTTPS Configuration
Railway automatically provides HTTPS, but ensure your app handles it:
```javascript
// Trust proxy for Railway
app.set('trust proxy', 1);
```

### Issue: "Credential encryption not verified"

**Symptoms**:
```
❌ FAIL: Credential Encryption
📊 Error: API secrets stored in plain text
```

**Solutions**:

#### Solution 1: Implement Proper Encryption
```javascript
const crypto = require('crypto');

// Encrypt sensitive data
function encryptSecret(secret) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: cipher.getAuthTag().toString('hex')
    };
}
```

## Frontend Integration Issues

### Issue: "Frontend not accessible"

**Symptoms**:
```
❌ FAIL: Production URL Loading
📊 Error: Failed to load URL: 404 Not Found
```

**Solutions**:

#### Solution 1: Check Frontend Deployment
```bash
# Test frontend URL directly
curl -I https://your-app.railway.app

# Check if it's a routing issue
curl -I https://your-app.railway.app/index.html
```

#### Solution 2: Verify Build Configuration
Check your build configuration:
```json
{
  "scripts": {
    "build": "vite build",
    "start": "vite preview --port $PORT --host 0.0.0.0"
  }
}
```

#### Solution 3: Railway Static Site Configuration
For static sites, ensure proper Railway configuration:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start"
  }
}
```

### Issue: "JavaScript execution failed"

**Symptoms**:
```
❌ FAIL: JavaScript Execution
📊 Error: ReferenceError: fetch is not defined
```

**Solutions**:

#### Solution 1: Add Polyfills
```javascript
// Add fetch polyfill for older browsers
if (!window.fetch) {
    import('whatwg-fetch');
}
```

#### Solution 2: Check Browser Compatibility
```javascript
// Check for required features
if (!window.Promise || !window.fetch) {
    console.error('Browser not supported');
    // Show fallback UI
}
```

### Issue: "Puppeteer not installed"

**Symptoms**:
```
⚠️ Puppeteer not installed. Running in basic mode without browser automation.
```

**Solutions**:

#### Solution 1: Install Puppeteer
```bash
# Install puppeteer for full browser testing
npm install puppeteer

# Or install puppeteer-core for lighter installation
npm install puppeteer-core
```

#### Solution 2: Use Docker for Puppeteer
```dockerfile
# Dockerfile for puppeteer support
FROM node:16
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Performance Problems

### Issue: "High response times"

**Symptoms**:
```
⚠️ WARNING: Response Time Threshold Exceeded
📊 Average: 8500ms (threshold: 5000ms)
```

**Diagnosis Steps**:
```bash
# 1. Run performance-focused tests
node oauth-verify-cli-v2.cjs --tests health,database --verbose

# 2. Check individual endpoint performance
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.railway.app/api/auth/broker/health
```

Create `curl-format.txt`:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

**Solutions**:

#### Solution 1: Database Query Optimization
```javascript
// Add database query optimization
const query = `
    SELECT * FROM oauth_tokens 
    WHERE user_id = $1 AND is_active = true 
    LIMIT 1
`;
// Use parameterized queries and indexes
```

#### Solution 2: Add Caching
```javascript
// Add Redis caching
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache frequently accessed data
async function getCachedData(key) {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
    
    const data = await fetchFromDatabase();
    await client.setex(key, 300, JSON.stringify(data)); // 5 min cache
    return data;
}
```

#### Solution 3: Railway Resource Scaling
```bash
# Upgrade Railway service resources
# Go to Railway dashboard -> Service -> Settings -> Resources
# Increase CPU and Memory allocation
```

### Issue: "Timeout errors"

**Symptoms**:
```
❌ FAIL: Request Timeout
📊 Error: Request timeout after 30000ms
```

**Solutions**:

#### Solution 1: Increase Timeout Values
```bash
# Increase CLI timeout
node oauth-verify-cli-v2.cjs all --verbose
# Edit monitoring-config.json to increase timeout
```

```json
{
  "verification": {
    "timeout": 60000,
    "retries": 3
  }
}
```

#### Solution 2: Optimize Application Performance
```javascript
// Add request timeout handling
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        res.status(408).json({ error: 'Request timeout' });
    });
    next();
});
```

## Monitoring and Alerting Issues

### Issue: "Monitoring not starting"

**Symptoms**:
```
❌ Failed to start monitor: Configuration error
```

**Solutions**:

#### Solution 1: Fix Configuration
```bash
# Check configuration
node monitoring-config-helper.cjs show

# Reset to defaults
rm monitoring-config.json
node monitoring-config-helper.cjs interactive
```

#### Solution 2: Check Permissions
```bash
# Ensure write permissions
chmod +w .
ls -la monitoring-*.json
```

### Issue: "Alerts not being sent"

**Symptoms**:
- Monitoring detects issues but no notifications received

**Solutions**:

#### Solution 1: Test Notification Configuration
```bash
# Check notification settings
node monitoring-config-helper.cjs show

# Test webhook manually
curl -X POST https://your-webhook-url \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

#### Solution 2: Enable Notifications
```bash
# Configure notifications interactively
node monitoring-config-helper.cjs interactive
# Enable webhook, Slack, or email notifications
```

### Issue: "False positive alerts"

**Symptoms**:
- Too many alerts for minor issues

**Solutions**:

#### Solution 1: Adjust Thresholds
```json
{
  "thresholds": {
    "successRate": 70,        // Lower from 80
    "responseTime": 8000,     // Increase from 5000
    "errorRate": 15,          // Increase from 10
    "consecutiveFailures": 5  // Increase from 3
  }
}
```

#### Solution 2: Use Environment-Specific Presets
```bash
# Use development preset for less strict monitoring
cp monitoring-config-development.json monitoring-config.json
```

## Environment-Specific Problems

### Railway Deployment Issues

**Issue: "Service not responding"**

**Solutions**:

#### Solution 1: Check Railway Service Status
1. Go to Railway Dashboard
2. Check service status (should be "Active")
3. Review deployment logs for errors
4. Check resource usage

#### Solution 2: Verify Environment Variables
```bash
# Check required environment variables
node oauth-verify-cli-v2.cjs railway --verbose
```

Required variables:
- `DATABASE_URL`
- `NODE_ENV=production`
- `PORT` (automatically set by Railway)

#### Solution 3: Check Build Configuration
Ensure `package.json` has correct scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "npm install"
  }
}
```

### Local Development Issues

**Issue: "Tests fail in local environment"**

**Solutions**:

#### Solution 1: Use Local Configuration
```bash
# Test against local server
node oauth-verify-cli-v2.cjs --url http://localhost:3000 --tests health,oauth
```

#### Solution 2: Setup Local Database
```bash
# Start local PostgreSQL
docker run -d \
  --name postgres-local \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=oauth_test \
  -p 5432:5432 \
  postgres:13

# Set local DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@localhost:5432/oauth_test"
```

## Error Code Reference

### HTTP Status Codes

| Code | Meaning | Common Causes | Solutions |
|------|---------|---------------|-----------|
| 404 | Not Found | Route not configured, deployment issue | Check routing, verify deployment |
| 500 | Internal Server Error | Database connection, application error | Check logs, verify DATABASE_URL |
| 400 | Bad Request | Invalid request data, validation error | Check request format, validation rules |
| 401 | Unauthorized | Authentication failure | Check credentials, auth configuration |
| 403 | Forbidden | Permission denied | Check authorization logic |
| 408 | Request Timeout | Slow response, network issues | Optimize performance, increase timeouts |
| 502 | Bad Gateway | Service unavailable | Check service status, restart if needed |
| 503 | Service Unavailable | Overloaded, maintenance | Scale resources, check system load |

### Verification Status Codes

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| PASSED | Test completed successfully | None |
| FAILED | Test failed, issues detected | Investigate and fix issues |
| WARNING | Minor issues detected | Monitor, consider fixing |
| ERROR | Test execution failed | Check test configuration |
| TIMEOUT | Test timed out | Optimize performance or increase timeout |
| SKIPPED | Test was skipped | Check test dependencies |

### Alert Severity Levels

| Severity | Threshold | Response Time | Escalation |
|----------|-----------|---------------|------------|
| LOW | Minor performance degradation | 24 hours | None |
| MEDIUM | Moderate issues | 4 hours | Email notification |
| HIGH | Significant problems | 1 hour | Slack + Email |
| CRITICAL | System failure | Immediate | All channels + escalation |

## Recovery Procedures

### Complete System Recovery

#### Step 1: Assess System State
```bash
# Quick health assessment
node oauth-verify-cli-v2.cjs health --verbose

# Check all components
node oauth-verify-cli-v2.cjs all --format json --output system-state.json
```

#### Step 2: Database Recovery
```bash
# Fix database connectivity
node fix-database-connectivity.cjs

# Verify database schema
node fix-database-schema.cjs

# Test database functionality
node oauth-verify-cli-v2.cjs database --verbose
```

#### Step 3: Application Recovery
```bash
# Check Railway deployment
node oauth-verify-cli-v2.cjs railway --verbose

# Verify OAuth endpoints
node oauth-verify-cli-v2.cjs oauth --verbose

# Test end-to-end functionality
node oauth-verify-cli-v2.cjs end-to-end --verbose
```

#### Step 4: Monitoring Recovery
```bash
# Reset monitoring configuration
node monitoring-config-helper.cjs presets
cp monitoring-config-production.json monitoring-config.json

# Clear old alerts
rm monitoring-alerts.json

# Restart monitoring
node continuous-verification-monitor.cjs start
```

### Rollback Procedures

#### Application Rollback
1. **Identify last known good deployment**:
   - Check Railway deployment history
   - Review monitoring reports for last successful period

2. **Rollback in Railway**:
   - Go to Railway Dashboard
   - Navigate to Deployments tab
   - Click "Redeploy" on last successful deployment

3. **Verify rollback**:
   ```bash
   node oauth-verify-cli-v2.cjs all --verbose
   ```

#### Configuration Rollback
```bash
# Backup current configuration
cp monitoring-config.json monitoring-config-backup.json

# Restore from backup
cp monitoring-config-backup-YYYYMMDD.json monitoring-config.json

# Restart monitoring with restored config
node continuous-verification-monitor.cjs start
```

### Emergency Contacts and Escalation

#### Escalation Matrix
1. **Level 1**: Development Team
   - Response time: 1 hour
   - Contact: Slack #dev-alerts

2. **Level 2**: Technical Lead
   - Response time: 30 minutes
   - Contact: Email + Phone

3. **Level 3**: Operations Manager
   - Response time: 15 minutes
   - Contact: Emergency hotline

#### Emergency Procedures
1. **Immediate Response**:
   - Stop continuous monitoring if causing issues
   - Switch to manual verification mode
   - Document all actions taken

2. **Communication**:
   - Notify stakeholders of issue
   - Provide regular status updates
   - Document resolution steps

3. **Post-Incident**:
   - Conduct post-mortem analysis
   - Update procedures based on learnings
   - Improve monitoring and alerting

---

## Quick Reference Commands

### Diagnostic Commands
```bash
# Quick health check
node oauth-verify-cli-v2.cjs health

# Full system diagnosis
node oauth-verify-cli-v2.cjs all --verbose

# Database-specific diagnosis
node oauth-verify-cli-v2.cjs database --verbose

# Check monitoring status
node continuous-verification-monitor.cjs interactive
```

### Recovery Commands
```bash
# Fix database connectivity
node fix-database-connectivity.cjs

# Reset test data
node test-data-management.cjs cleanup
node test-data-management.cjs setup

# Reset monitoring
rm monitoring-*.json
node monitoring-config-helper.cjs presets
```

### Emergency Commands
```bash
# Stop monitoring
pkill -f continuous-verification-monitor

# Emergency system check
curl -I https://your-app.railway.app/api/auth/broker/health

# Generate emergency report
node oauth-verify-cli-v2.cjs all --format html --output emergency-report.html
```

---

*This troubleshooting guide covers the most common issues and their solutions. For additional support, refer to the main verification guide and system documentation.*