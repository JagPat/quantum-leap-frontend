# Backend Implementation Guide

## Overview
This document provides the **minimal backend changes** needed to support the clean, elegant OAuth flow.

## Required Changes

### 1. OAuth Setup Endpoint Enhancement

**File**: `app/auth/router.py` (or equivalent)

**Current endpoint**:
```python
@router.post("/test-oauth")
async def test_oauth(api_key: str, api_secret: str):
    # ... existing code ...
    return {
        "status": "success",
        "oauth_url": f"https://kite.zerodha.com/connect/login?api_key={api_key}&v=3",
        "redirect_url": "https://web-production-de0bc.up.railway.app/api/auth/broker/callback"
    }
```

**Enhanced endpoint**:
```python
@router.post("/test-oauth")
async def test_oauth(api_key: str, api_secret: str, frontend_url: str = None):
    # Store frontend_url in session for callback use
    if frontend_url:
        session['frontend_url'] = frontend_url
    
    # ... existing code ...
    return {
        "status": "success",
        "oauth_url": f"https://kite.zerodha.com/connect/login?api_key={api_key}&v=3",
        "redirect_url": "https://web-production-de0bc.up.railway.app/api/auth/broker/callback"
    }
```

### 2. OAuth Callback Enhancement

**File**: `app/auth/router.py` (or equivalent)

**Current callback**:
```python
@router.get("/callback")
async def oauth_callback(request_token: str, status: str = None):
    # ... process OAuth ...
    
    if success:
        return RedirectResponse(
            url=f"http://localhost:5173/broker-callback?status=success&user_id={user_id}"
        )
    else:
        return RedirectResponse(
            url=f"http://localhost:5173/broker-callback?status=error&error={error}"
        )
```

**Enhanced callback**:
```python
@router.get("/callback")
async def oauth_callback(request_token: str, status: str = None):
    # ... process OAuth ...
    
    # Get frontend URL from session, fallback to localhost
    frontend_url = session.get('frontend_url', 'http://localhost:5173')
    
    if success:
        return RedirectResponse(
            url=f"{frontend_url}/broker-callback?status=success&user_id={user_id}&parent_origin={frontend_url}"
        )
    else:
        return RedirectResponse(
            url=f"{frontend_url}/broker-callback?status=error&error={error}&parent_origin={frontend_url}"
        )
```

## Complete Implementation Example

### FastAPI Implementation

```python
from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse
from starlette.sessions import Session

router = APIRouter()

@router.post("/test-oauth")
async def test_oauth(
    request: Request,
    api_key: str, 
    api_secret: str, 
    frontend_url: str = None
):
    """Setup OAuth credentials and return OAuth URL"""
    
    # Store credentials in session
    request.session['api_key'] = api_key
    request.session['api_secret'] = api_secret
    
    # Store frontend URL for callback redirect
    if frontend_url:
        request.session['frontend_url'] = frontend_url
    
    # Generate OAuth URL
    oauth_url = f"https://kite.zerodha.com/connect/login?api_key={api_key}&v=3"
    
    return {
        "status": "success",
        "message": "OAuth credentials stored in session",
        "oauth_url": oauth_url,
        "redirect_url": f"{request.base_url}api/auth/broker/callback"
    }

@router.get("/callback")
async def oauth_callback(request: Request, request_token: str, status: str = None):
    """Handle OAuth callback from Zerodha"""
    
    # Get stored credentials and frontend URL
    api_key = request.session.get('api_key')
    api_secret = request.session.get('api_secret')
    frontend_url = request.session.get('frontend_url', 'http://localhost:5173')
    
    try:
        if not api_key or not api_secret:
            raise Exception("Missing API credentials in session")
        
        # Process OAuth token exchange
        # ... your existing OAuth processing logic ...
        
        # On success
        callback_url = f"{frontend_url}/broker-callback"
        return RedirectResponse(
            url=f"{callback_url}?status=success&user_id={user_id}&parent_origin={frontend_url}"
        )
        
    except Exception as e:
        # On error
        callback_url = f"{frontend_url}/broker-callback"
        return RedirectResponse(
            url=f"{callback_url}?status=error&error={str(e)}&parent_origin={frontend_url}"
        )
```

### Django Implementation

```python
# views.py
from django.http import JsonResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["POST"])
def test_oauth(request):
    """Setup OAuth credentials and return OAuth URL"""
    
    data = json.loads(request.body) if request.body else {}
    api_key = request.GET.get('api_key') or data.get('api_key')
    api_secret = request.GET.get('api_secret') or data.get('api_secret')
    frontend_url = request.GET.get('frontend_url') or data.get('frontend_url')
    
    # Store in session
    request.session['api_key'] = api_key
    request.session['api_secret'] = api_secret
    if frontend_url:
        request.session['frontend_url'] = frontend_url
    
    oauth_url = f"https://kite.zerodha.com/connect/login?api_key={api_key}&v=3"
    
    return JsonResponse({
        "status": "success",
        "message": "OAuth credentials stored in session",
        "oauth_url": oauth_url,
        "redirect_url": f"{request.build_absolute_uri('/api/auth/broker/callback')}"
    })

def oauth_callback(request):
    """Handle OAuth callback from Zerodha"""
    
    request_token = request.GET.get('request_token')
    api_key = request.session.get('api_key')
    api_secret = request.session.get('api_secret')
    frontend_url = request.session.get('frontend_url', 'http://localhost:5173')
    
    try:
        if not api_key or not api_secret:
            raise Exception("Missing API credentials in session")
        
        # Process OAuth token exchange
        # ... your existing OAuth processing logic ...
        
        # On success
        return HttpResponseRedirect(
            f"{frontend_url}/broker-callback?status=success&user_id={user_id}&parent_origin={frontend_url}"
        )
        
    except Exception as e:
        # On error
        return HttpResponseRedirect(
            f"{frontend_url}/broker-callback?status=error&error={str(e)}&parent_origin={frontend_url}"
        )
```

## Key Points

1. **Minimal Changes**: Only 2 endpoints need modification
2. **Backward Compatible**: Still works with hardcoded URLs as fallback
3. **Clean Architecture**: Frontend URL is passed as parameter, not hardcoded
4. **Session Storage**: Uses existing session mechanism
5. **Error Handling**: Proper error responses with parent_origin parameter

## Testing

After implementing these changes:

1. **Development**: Frontend automatically passes `http://localhost:5175` (or current port)
2. **Staging**: Frontend passes `https://staging.yourdomain.com`
3. **Production**: Frontend passes `https://yourdomain.com`

The OAuth callback will redirect to the correct frontend URL with the `parent_origin` parameter, eliminating all cross-origin issues.

## Migration Strategy

1. **Phase 1**: Implement backend changes (backward compatible)
2. **Phase 2**: Deploy frontend (uses new parameter)
3. **Phase 3**: Remove hardcoded fallbacks (optional)

This ensures zero downtime and smooth deployment across all environments. 