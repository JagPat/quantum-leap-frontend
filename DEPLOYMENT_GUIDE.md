# Deployment Guide - Quantum Leap Trading Frontend

## Overview

This document provides comprehensive instructions for deploying the Quantum Leap Trading frontend application across different environments (development, staging, production).

## Key Features of Our Deployment-Ready Solution

### 1. **Environment-Agnostic Configuration**
- Automatically detects development vs production environment
- Dynamic URL generation based on current environment
- Centralized configuration in `src/config/deployment.js`

### 2. **Robust OAuth Callback System**
- **No hardcoded ports or URLs**
- **Cross-origin messaging with intelligent fallbacks**
- **Parent origin detection via URL parameters**
- **Works seamlessly across all deployment scenarios**

### 3. **Backend Integration**
- **Minimal backend changes required**
- **RESTful API endpoints**
- **Secure token handling**

## Deployment Scenarios

### Development Environment

#### Local Development
```bash
# Start the development server
npm run dev

# The application will automatically:
# - Detect it's in development mode
# - Use appropriate backend URLs
# - Handle dynamic port assignment (5173, 5174, 5175, etc.)
# - Enable debug logging
```

#### Configuration
- Frontend: `http://localhost:5173` (or any available port)
- Backend: `https://web-production-de0bc.up.railway.app` (or local if available)
- OAuth Callback: `http://localhost:5173/broker-callback`

### Staging Environment

#### Deployment Steps
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to staging server**
   ```bash
   # Example for various platforms
   # Vercel: vercel --prod
   # Netlify: netlify deploy --prod
   # AWS S3: aws s3 sync dist/ s3://your-staging-bucket
   ```

3. **Environment Detection**
   - The app automatically detects staging environment
   - Uses production backend URLs
   - Disables debug logging

#### Configuration
- Frontend: `https://staging.yourdomain.com`
- Backend: `https://api-staging.yourdomain.com`
- OAuth Callback: `https://staging.yourdomain.com/broker-callback`

### Production Environment

#### Deployment Steps
1. **Build for production**
   ```bash
   npm run build
   ```

2. **Deploy to production server**
   ```bash
   # Example deployments
   # Vercel: vercel --prod
   # Netlify: netlify deploy --prod
   # AWS CloudFront: aws cloudfront create-invalidation
   ```

3. **Update backend configuration**
   - Ensure backend accepts requests from production domain
   - Update CORS settings
   - Configure OAuth redirect URLs

#### Configuration
- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com`
- OAuth Callback: `https://yourdomain.com/broker-callback`

## Backend Requirements

### Minimal Backend Changes Needed

The frontend is designed to work with minimal backend modifications:

#### 1. **OAuth URL Parameter Support**
The backend should accept an optional `parent_origin` parameter:

```python
# Example backend modification (Python/FastAPI)
@app.post("/api/auth/broker/test-oauth")
async def test_oauth(api_key: str, api_secret: str, parent_origin: str = None):
    # Store parent_origin for later use in callback
    session['parent_origin'] = parent_origin
    
    # Generate OAuth URL as usual
    oauth_url = f"https://kite.zerodha.com/connect/login?api_key={api_key}&v=3"
    
    return {
        "status": "success",
        "oauth_url": oauth_url,
        "redirect_url": "https://your-backend.com/api/auth/broker/callback"
    }
```

#### 2. **Callback URL Enhancement**
The backend callback should include the parent origin:

```python
@app.get("/api/auth/broker/callback")
async def oauth_callback(request_token: str, status: str = None):
    # Process the OAuth callback as usual
    # ...
    
    # Get stored parent_origin
    parent_origin = session.get('parent_origin', 'http://localhost:5173')
    
    # Redirect to frontend with parent_origin parameter
    callback_url = f"{parent_origin}/broker-callback"
    
    if status == "success":
        return RedirectResponse(
            url=f"{callback_url}?status=success&user_id={user_id}&parent_origin={parent_origin}"
        )
    else:
        return RedirectResponse(
            url=f"{callback_url}?status=error&error={error}&parent_origin={parent_origin}"
        )
```

### Alternative: No Backend Changes Required

If you prefer not to modify the backend, the frontend will still work with the existing intelligent fallback system:

1. **Referrer-based detection**
2. **Cross-origin safe messaging**
3. **Multiple origin attempts**

## Configuration Management

### Environment Variables

Create environment-specific configuration:

```javascript
// .env.development
VITE_BACKEND_URL=http://localhost:8000
VITE_ENVIRONMENT=development

// .env.production
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

### Dynamic Configuration

The `src/config/deployment.js` file automatically handles:

- **Backend URL detection**
- **Environment-specific settings**
- **API endpoint generation**
- **CORS configuration**

## Security Considerations

### 1. **Origin Validation**
- Only trusted origins are allowed for postMessage
- Automatic origin detection with fallbacks
- No hardcoded development URLs in production

### 2. **Token Security**
- Secure token storage in localStorage
- Automatic token cleanup on errors
- Backend-handled token exchange

### 3. **CORS Configuration**
Ensure your backend allows requests from:
- Development: `http://localhost:*`
- Staging: `https://staging.yourdomain.com`
- Production: `https://yourdomain.com`

## Troubleshooting

### Common Issues

#### 1. **Cross-Origin Errors**
```
Solution: Check that backend CORS settings include your frontend domain
```

#### 2. **OAuth Callback Fails**
```
Solution: Verify that the callback URL in your Kite Connect app matches your backend
```

#### 3. **PostMessage Errors**
```
Solution: The new system automatically handles this with fallbacks
```

### Debug Mode

Enable debug logging in development:
```javascript
// The system automatically enables debug logging in development
// Check browser console for detailed OAuth flow information
```

## Monitoring and Logging

### Development
- Full console logging enabled
- Detailed OAuth flow tracking
- Error reporting with stack traces

### Production
- Error logging only
- Performance monitoring
- User action tracking

## Performance Optimization

### Build Optimization
```bash
# Production build with optimizations
npm run build

# Analyze bundle size
npm run analyze
```

### Caching Strategy
- Static assets: Long-term caching
- API responses: Short-term caching
- OAuth tokens: Secure storage

## Conclusion

This deployment-ready solution provides:

✅ **Zero hardcoded URLs or ports**  
✅ **Automatic environment detection**  
✅ **Robust cross-origin handling**  
✅ **Minimal backend changes required**  
✅ **Comprehensive error handling**  
✅ **Production-ready security**  
✅ **Easy troubleshooting and monitoring**

The system is designed to work seamlessly across all deployment scenarios with minimal configuration changes.

---

## Quick Deployment Checklist

- [ ] Update `src/config/deployment.js` with your domains
- [ ] Configure backend CORS settings
- [ ] Update OAuth app redirect URLs
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor OAuth flow in production

For technical support or questions, refer to the inline code documentation or contact the development team. 