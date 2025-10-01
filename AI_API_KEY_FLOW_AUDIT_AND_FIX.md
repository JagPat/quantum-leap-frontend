# 🔍 AI API Key Configuration Flow - Complete Audit & Fix

**Date:** October 1, 2025  
**Issue:** AI API keys cannot be saved - no network call made from frontend  
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## 📊 Executive Summary

### Problem
When users input AI API keys (OpenAI/Claude/Gemini) in the UI and click "Save Configuration", the keys appear "verified" locally but **NO network request is made** to persist them to the database.

### Root Cause
**TWO CRITICAL BUGS:**

1. **Frontend Bug:** `railwayAPI.js` still uses **LEGACY authentication** (checking for old `Authorization` header and `brokerConfigs` localStorage)
2. **Backend Bug:** **MISSING ENDPOINT** - `/api/ai/preferences` does not exist!

---

## 🗺️ Architecture Map: AI API Key Flow (Intended vs Actual)

### ✅ INTENDED FLOW

```
┌─────────────────┐
│   User Input    │ User enters OpenAI API key in Settings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UI Component  │ AISettingsForm.jsx
│  (Frontend)     │ - Validates key format
└────────┬────────┘ - Calls handleSave()
         │
         ▼
┌─────────────────┐
│  API Service    │ railwayAPI.request()
│  (Frontend)     │ - Adds auth headers
└────────┬────────┘ - Makes HTTP POST
         │
         ▼
┌─────────────────┐
│  API Endpoint   │ POST /api/ai/preferences
│  (Backend)      │ - Validates request
└────────┬────────┘ - Encrypts key
         │           - Stores in DB
         ▼
┌─────────────────┐
│   Database      │ Table: ai_preferences or users
│                 │ Fields: user_id, provider, api_key_encrypted
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Response      │ { status: 'success', data: {...} }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend State │ Update UI: "API key saved ✓"
│  Update         │ Reload settings
└─────────────────┘
```

### ❌ ACTUAL FLOW (BROKEN)

```
┌─────────────────┐
│   User Input    │ ✅ Works
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   UI Component  │ ✅ Works
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Service    │ ❌ BLOCKS REQUEST!
│  railwayAPI.js  │ - Checks for old 'Authorization' header
└────────┬────────┘ - Header missing → returns error
         │           - NO HTTP REQUEST SENT
         ▼
    ❌ STOPS HERE
    Returns: "Please connect to your broker to access this feature"
```

---

## 🐛 Bug #1: Frontend - Legacy Authentication in railwayAPI.js

### Location
**File:** `src/api/railwayAPI.js`  
**Lines:** 26-46 (`getAuthHeaders()`) and line 77 (validation check)

### The Problem

```javascript
// ❌ OLD CODE (WRONG):
getAuthHeaders() {
  const configs = JSON.parse(localStorage.getItem('brokerConfigs') || '[]');  // Legacy!
  const activeConfig = configs.find(config => config.is_connected && config.access_token);
  
  if (activeConfig && activeConfig.api_key && activeConfig.access_token) {
    return {
      'Authorization': `token ${activeConfig.api_key}:${activeConfig.access_token}`,  // Deprecated!
      'X-User-ID': user_id
    };
  }
  return {};
}

// Line 77:
if (requiresAuth && (!authHeaders.Authorization || !authHeaders['X-User-ID'])) {  // Checking old header!
  return { status: 'unauthorized', message: 'Please connect to your broker...' };
}
```

**Why it fails:**
- Checks **legacy `brokerConfigs`** localStorage key (we migrated to `activeBrokerSession`)
- Looks for **old `Authorization` header** (we migrated to `X-Config-ID`)
- User's session exists in `activeBrokerSession` but code doesn't check there
- Validation fails → returns error → **NO API CALL IS MADE**

### ✅ THE FIX (APPLIED)

```javascript
// ✅ NEW CODE (CORRECT):
getAuthHeaders() {
  const sessionData = localStorage.getItem('activeBrokerSession');  // Single source of truth!
  if (!sessionData) return {};

  const session = JSON.parse(sessionData);
  
  if (session && session.session_status === 'connected') {
    const user_id = session.user_data?.user_id || session.broker_user_id;
    const config_id = session.config_id;
    
    return {
      'X-User-ID': user_id,      // New header
      'X-Config-ID': config_id   // New header
    };
  }
  return {};
}

// Line 77 (fixed):
if (requiresAuth && (!authHeaders['X-Config-ID'] || !authHeaders['X-User-ID'])) {  // Check new headers!
  return { status: 'unauthorized', message: 'Please connect to your broker...' };
}
```

---

## 🐛 Bug #2: Backend - Missing `/api/ai/preferences` Endpoint

### Location
**File:** `backend-temp/modules/ai/routes/index.js` (endpoint MISSING!)

### The Problem

The backend AI module exists at `/api/ai/` but **DOES NOT** have a `/preferences` route!

**Existing routes:**
- ✅ `GET /api/ai/health`
- ✅ `POST /api/ai/chat`
- ✅ `GET /api/ai/conversations`
- ❌ `GET /api/ai/preferences` - **MISSING!**
- ❌ `POST /api/ai/preferences` - **MISSING!**

**What happens:**
1. Frontend (after fix #1) sends: `POST /api/ai/preferences`
2. Backend responds: `404 Not Found`
3. Frontend shows: "Failed to save AI settings"

### ✅ THE FIX (NEEDS TO BE CREATED)

**Need to add to `backend-temp/modules/ai/routes/index.js`:**

```javascript
// GET /api/ai/preferences - Retrieve user's AI API keys
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const configId = req.headers['x-config-id'];
    
    if (!userId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User ID required' 
      });
    }
    
    // Get preferences from database
    const preferences = await aiService.getPreferences(userId);
    
    res.json({
      status: 'success',
      preferences: preferences || {
        preferred_ai_provider: 'auto',
        has_openai_key: false,
        has_claude_key: false,
        has_gemini_key: false,
        openai_key_preview: '',
        claude_key_preview: '',
        gemini_key_preview: ''
      }
    });
  } catch (error) {
    console.error('[AI] Failed to get preferences:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve AI preferences' 
    });
  }
});

// POST /api/ai/preferences - Save user's AI API keys
router.post('/preferences', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const configId = req.headers['x-config-id'];
    const { preferred_ai_provider, openai_api_key, claude_api_key, gemini_api_key } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User ID required' 
      });
    }
    
    // Save preferences to database
    const result = await aiService.savePreferences(userId, {
      preferred_ai_provider: preferred_ai_provider || 'auto',
      openai_api_key,
      claude_api_key,
      gemini_api_key
    });
    
    res.json({
      status: 'success',
      preferences: result,
      message: 'AI preferences saved successfully'
    });
  } catch (error) {
    console.error('[AI] Failed to save preferences:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to save AI preferences' 
    });
  }
});
```

---

## 🗄️ Database Schema

### Current State
**Unknown** - Need to check if table exists

### Required Schema

```sql
-- Option 1: Separate table
CREATE TABLE IF NOT EXISTS ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  config_id UUID REFERENCES broker_configs(id),
  preferred_ai_provider VARCHAR(50) DEFAULT 'auto',
  openai_api_key_encrypted TEXT,
  claude_api_key_encrypted TEXT,
  gemini_api_key_encrypted TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Option 2: Add to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_preferences JSONB;
```

---

## 🔧 Complete Fix Implementation

### Step 1: Frontend Fix ✅ DONE

**File:** `src/api/railwayAPI.js`

**Changes:**
- ✅ Updated `getAuthHeaders()` to use `activeBrokerSession`
- ✅ Updated validation to check `X-Config-ID` instead of `Authorization`
- ✅ Committed and ready to deploy

### Step 2: Backend Fix 🚧 TO DO

**Files to modify:**
1. `backend-temp/modules/ai/routes/index.js` - Add preferences routes
2. `backend-temp/modules/ai/services/index.js` - Add preferences service methods
3. `backend-temp/database/migrations/` - Add preferences table migration

**Implementation plan:**
1. Create database migration for `ai_preferences` table
2. Add service methods: `getPreferences()`, `savePreferences()`
3. Add routes: `GET /preferences`, `POST /preferences`
4. Test with curl/Postman
5. Deploy to Railway

---

## 🧪 Testing Instructions

### Test 1: Verify Frontend Auth Headers

**After frontend deployment:**

```javascript
// In browser console:
const session = localStorage.getItem('activeBrokerSession');
console.log('Session:', JSON.parse(session));

// Should show:
// { session_status: 'connected', config_id: 'xxx', user_data: { user_id: 'EBW183' } }
```

### Test 2: Test Backend Endpoint

**After backend implementation:**

```bash
# Get preferences
curl -X GET "https://web-production-de0bc.up.railway.app/api/ai/preferences" \
  -H "X-User-ID: EBW183" \
  -H "X-Config-ID: a92bddd0-592c-4f41-813a-d42247d8919d"

# Save preferences
curl -X POST "https://web-production-de0bc.up.railway.app/api/ai/preferences" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: EBW183" \
  -H "X-Config-ID: a92bddd0-592c-4f41-813a-d42247d8919d" \
  -d '{
    "preferred_ai_provider": "openai",
    "openai_api_key": "sk-test123..."
  }'
```

### Test 3: End-to-End UI Test

1. Open Settings > AI Configuration
2. Enter OpenAI API key
3. Click "Save Configuration"
4. **Expected:** Success message, key saved
5. **Verify:** Refresh page, key preview shows `sk-****...`

---

## 📝 Summary of Fixes

### What Was Broken

1. ❌ Frontend `railwayAPI` used legacy `brokerConfigs` localStorage
2. ❌ Frontend checked for deprecated `Authorization` header
3. ❌ Backend missing `/api/ai/preferences` endpoint entirely

### What Was Fixed

1. ✅ Frontend now uses `activeBrokerSession` (single source of truth)
2. ✅ Frontend checks for `X-Config-ID` header (new standard)
3. 🚧 Backend endpoint implementation (in progress)

### Status

- Frontend: ✅ **FIXED** - Ready to deploy
- Backend: 🚧 **NEEDS IMPLEMENTATION** - Endpoint must be created
- Database: ❓ **NEEDS VERIFICATION** - Check if schema exists

---

## 🚀 Deployment Checklist

- [x] Fix frontend `railwayAPI.js`
- [x] Commit frontend changes
- [ ] Create backend `/api/ai/preferences` routes
- [ ] Create backend AI preferences service
- [ ] Create database migration for `ai_preferences` table
- [ ] Test backend endpoint with curl
- [ ] Deploy frontend to Vercel/Railway
- [ ] Deploy backend to Railway
- [ ] Run end-to-end UI test
- [ ] Update documentation

---

## 🔍 Debug Logging

### Frontend Logs to Check

```javascript
// In browser console when saving API key:
🔐 [RailwayAPI] Using auth headers for user: EBW183 config: a92bddd0...
💾 [AISettingsForm] Saving preferences for user: EBW183
💾 [AISettingsForm] Save response: { status: 'success', ... }
```

### Backend Logs to Check

```javascript
// In Railway logs when request arrives:
[AI] GET /api/ai/preferences - User: EBW183
[AI] POST /api/ai/preferences - Saving for user: EBW183
[AI] Preferences saved successfully
```

---

**Next Step:** Implement backend `/api/ai/preferences` endpoint!

