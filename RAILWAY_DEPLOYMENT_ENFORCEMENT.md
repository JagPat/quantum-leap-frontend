# Railway Frontend Deployment Enforcement

This document outlines the procedures to ensure Railway frontend deployments are consistent and verifiable.

## 🚨 Critical Issue

Railway frontend sometimes deploys old SHAs, causing inconsistencies between expected and deployed code.

## ✅ Solution Implementation

### 1. Branch Enforcement

**Railway MUST deploy ONLY from the `main` branch.**

#### Railway Dashboard Configuration Steps:

1. **Access Railway Dashboard**
   - Go to: https://railway.app/
   - Navigate to: `quantum-leap-frontend` project

2. **Configure Deployment Settings**
   - Click on the service: `quantum-leap-frontend`
   - Go to: **Settings** → **Deployments**
   - Ensure **Auto Deploy** is enabled
   - Set **Branch** to: `main` (not `master` or any other branch)
   - Verify **GitHub Connection** is active

3. **Verify GitHub Integration**
   - Go to: **Settings** → **GitHub**
   - Confirm repository: `JagPat/quantum-leap-frontend`
   - Ensure webhook is active and pointing to `main` branch

4. **Manual Verification**
   - Go to: **Deployments** tab
   - Check that latest deployments show commits from `main` branch
   - Verify commit SHAs match GitHub repository

### 2. Post-Deploy Verification

#### GitHub Actions Workflow

The `.github/workflows/verify-frontend.yml` workflow automatically:

- Triggers on pushes to `main` branch
- Waits 2 minutes for Railway deployment
- Verifies frontend accessibility
- Checks deployed commit SHA matches expected SHA
- Reports success/failure status

#### Manual Verification Script

Use the verification script to check deployments:

```bash
# Basic verification (no SHA check)
./scripts/verify_frontend.sh

# Verify specific commit SHA
EXPECTED_SHA=abc12345 ./scripts/verify_frontend.sh

# Verify different frontend URL
FRONTEND_URL=https://staging.example.com ./scripts/verify_frontend.sh
```

### 3. Clear Cache & Redeploy Procedure

When Railway deploys old SHAs, follow this procedure:

#### Step 1: Verify Branch Configuration
```bash
# Check current branch
git branch --show-current

# Ensure you're on main branch
git checkout main
git pull origin main
```

#### Step 2: Force Railway Redeploy
```bash
# Create empty commit to trigger Railway
git commit --allow-empty -m "trigger: force Railway redeploy from main branch"

# Push to main branch
git push origin main
```

#### Step 3: Verify Deployment
```bash
# Wait 2-3 minutes, then verify
./scripts/verify_frontend.sh
```

#### Step 4: Railway Dashboard Verification
1. Go to Railway dashboard
2. Check **Deployments** tab
3. Verify latest deployment shows correct commit SHA
4. Check deployment logs for any errors

### 4. Version Endpoint Verification

The frontend serves version information at `/version`:

```bash
# Check deployed version
curl https://quantum-leap-frontend-production.up.railway.app/version

# Expected response:
{
  "service": "quantum-leap-frontend",
  "commit": "abc12345...",
  "buildTime": "2025-10-02T12:00:00Z",
  "status": "ROCK_SOLID_CERTIFIED"
}
```

### 5. Troubleshooting

#### Issue: Railway deploys old commit
**Solution:**
1. Check Railway branch configuration (must be `main`)
2. Verify GitHub webhook is active
3. Force redeploy with empty commit
4. Check Railway deployment logs

#### Issue: Health check fails
**Solution:**
1. Check nginx configuration in `nginx.conf.template`
2. Verify `docker-entrypoint.sh` logs PORT correctly
3. Check Railway environment variables
4. Review deployment logs for startup errors

#### Issue: Version endpoint not accessible
**Solution:**
1. Verify `version.json` is created during build
2. Check nginx location block for `/version`
3. Ensure file permissions are correct
4. Test locally with Docker

### 6. Monitoring

#### Automated Monitoring
- GitHub Actions workflow runs on every push to `main`
- Verification script checks accessibility and SHA match
- PR comments show deployment status

#### Manual Monitoring
- Check Railway dashboard daily
- Verify `/version` endpoint returns correct SHA
- Monitor deployment logs for errors

## 🔧 Technical Implementation

### Dockerfile Changes
- Build argument `COMMIT_SHA` injected by Railway
- `version.json` created with build metadata
- Nginx serves static files including version info

### Nginx Configuration
- `/version` endpoint serves `version.json`
- Dynamic PORT binding via `envsubst`
- Logs directed to stdout/stderr for Railway

### Verification Script
- Checks frontend accessibility
- Compares deployed SHA with expected SHA
- Retries with exponential backoff
- Clear pass/fail reporting

## 📋 Checklist

Before deploying:
- [ ] Ensure on `main` branch
- [ ] Verify Railway branch configuration
- [ ] Check GitHub webhook status
- [ ] Run verification script locally

After deploying:
- [ ] Wait 2-3 minutes for Railway deployment
- [ ] Run verification script
- [ ] Check Railway deployment logs
- [ ] Verify `/version` endpoint
- [ ] Confirm SHA matches expected commit

## 🚀 Quick Commands

```bash
# Force Railway redeploy
git commit --allow-empty -m "trigger: force Railway redeploy"
git push origin main

# Verify deployment
./scripts/verify_frontend.sh

# Check version endpoint
curl https://quantum-leap-frontend-production.up.railway.app/version

# Check Railway status
# (Manual check via Railway dashboard)
```
