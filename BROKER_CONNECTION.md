# Broker Connection & Authentication System

## Overview

The QuantumLeap Trading platform integrates with Zerodha Kite Connect API to provide live trading capabilities. This document outlines the authentication flow, connection monitoring, and status management system.

## Authentication Flow

### 1. Initial Setup
1. **User Input**: User provides Zerodha API credentials (API Key, API Secret, Username, Password)
2. **Credential Storage**: Credentials stored in localStorage via `BrokerConfig.create()`
3. **OAuth Initialization**: Frontend redirects to Zerodha OAuth login page

### 2. OAuth Flow
```
Frontend → Zerodha OAuth → User Login → Authorization → Callback → Backend → Session Token
```

**Detailed Steps:**
1. User clicks "Connect to Zerodha" in BrokerSetup component
2. Frontend constructs OAuth URL with API key and callback URL
3. User redirected to Zerodha login page
4. User enters username, password, and 2FA token
5. Zerodha redirects to `/broker/callback` with `request_token`
6. BrokerCallback component sends request_token to Railway backend
7. Backend exchanges request_token for access_token via Kite API
8. Backend returns success response with session details
9. Frontend updates BrokerConfig with connection status

### 3. Session Management
- **Access Token**: Stored in BrokerConfig for API calls
- **User Data**: Includes user_id, username, and other session info
- **Connection Status**: Tracked via `is_connected` boolean

## Connection Status States

### Frontend Status States
- **`unknown`**: Initial state, configuration loading
- **`disconnected`**: No active connection or failed authentication
- **`connected`**: Successfully authenticated and connected
- **`connected_local`**: Local config shows connected but backend verification pending/failed
- **`checking`**: Currently verifying connection status
- **`error`**: Error occurred during status check

### Status Determination Logic
```javascript
// Priority order for status determination:
1. API connectivity (BrokerConfig.list() success)
2. Local storage configuration (is_connected flag)
3. Backend verification (heartbeat response)
4. Error handling (network/API failures)
```

## Heartbeat Monitoring System

### Purpose
- Verify live connection to Zerodha Kite API
- Detect token expiry or session invalidation
- Provide real-time connection status to users
- Handle backend/frontend synchronization

### Implementation
**File**: `src/pages/BrokerIntegration.jsx`

**Heartbeat Schedule**:
- Initial check: 5 seconds after connection
- Periodic checks: Every 60 seconds
- Manual checks: User-triggered via "Check Backend" button

**Backend Endpoint**: 
```
GET https://web-production-de0bc.up.railway.app/api/auth/broker/status?user_id={userId}
```

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "is_connected": true/false,
    "message": "Connection status description"
  }
}
```

### Heartbeat Logic Flow
```
1. Check if local config shows connected
2. If connected, send heartbeat to backend
3. Compare backend response with local status
4. Update UI status accordingly:
   - Backend connected: "Connected" (green)
   - Backend disconnected: "Connected (Local)" (yellow) 
   - Network error: "Connected (Local) - Backend unavailable"
```

## Status Display System

### Visual Indicators
- **Badge Colors**: Green (connected), Yellow (local only), Red (disconnected)
- **Icons**: Wifi (connected), Warning (local), WifiOff (disconnected)
- **Messages**: Detailed status with timestamps
- **Last Checked**: Shows when status was last verified

### Status Messages Examples
- `"Live connection verified at 2:30:45 PM"`
- `"Connected (Local) - Backend reports: No active session"`
- `"Connected (Local) - Backend unavailable: Network error"`
- `"Broker connected - monitoring live status..."`

## Error Handling

### Common Error Scenarios
1. **Token Expiry**: Zerodha access tokens expire daily
2. **Network Issues**: Backend unreachable or slow
3. **API Rate Limits**: Kite API throttling
4. **Session Conflicts**: Multiple login sessions

### Error Recovery
- **Graceful Degradation**: Show local status when backend fails
- **User Guidance**: Clear error messages with suggested actions
- **Manual Override**: "Check Backend" button for user-initiated verification
- **Re-authentication**: Automatic prompts when tokens expire

## Configuration Management

### Storage System
**Local Storage Keys**:
- `brokerConfigs`: Array of broker configurations
- `userData`: User profile and connection preferences

**BrokerConfig Schema**:
```javascript
{
  id: timestamp,
  broker_name: "zerodha",
  api_key: "encrypted_api_key",
  api_secret: "encrypted_api_secret", 
  access_token: "kite_access_token",
  user_data: {
    user_id: "user_identifier",
    username: "zerodha_username",
    // ... other session data
  },
  is_connected: boolean,
  created_at: timestamp,
  last_updated: timestamp
}
```

## API Integration Points

### Frontend APIs (entities.js)
- `BrokerConfig.create(data)`: Store new configuration
- `BrokerConfig.list()`: Retrieve existing configurations  
- `BrokerConfig.update(id, data)`: Update configuration
- `User.updateMyUserData(data)`: Update user profile

### Backend APIs (Railway)
- `POST /api/auth/broker/generate-session`: Exchange request_token for access_token
- `GET /api/auth/broker/status`: Check live connection status
- `GET /api/auth/broker/callback`: Handle OAuth callback (if needed)

## Security Considerations

### Data Protection
- **API Keys**: Stored in localStorage (consider encryption for production)
- **Access Tokens**: Short-lived, refreshed daily
- **User Data**: No passwords stored, only session information

### Session Security
- **Token Rotation**: Daily token refresh required
- **Logout Cleanup**: Clear all stored credentials on logout
- **HTTPS Only**: All API calls use encrypted transport

## Troubleshooting Guide

### Connection Issues
1. **"Disconnected" after successful auth**:
   - Check heartbeat logs in browser console
   - Verify backend is responding to status checks
   - Try manual "Check Backend" button

2. **"BrokerConfig.list is not a function"**:
   - Ensure entities.js is properly imported
   - Check for conflicting entity files
   - Verify Vite alias configuration (@/ paths)

3. **Backend status mismatch**:
   - Backend sessions may expire faster than frontend expects
   - Use "Connected (Local)" status as acceptable state
   - Re-authenticate if needed for live trading

### Debug Tools
- **Browser Console**: Check for heartbeat logs and errors
- **Network Tab**: Verify API calls are successful
- **localStorage**: Inspect stored configuration data
- **Screenshots**: Automated testing captures UI state

## Future Enhancements

### Planned Improvements
1. **Token Auto-Refresh**: Automatic daily token renewal
2. **Multi-Broker Support**: Support for additional brokers beyond Zerodha
3. **Enhanced Encryption**: Client-side encryption for stored credentials
4. **Real-time WebSocket**: Live market data and order updates
5. **Session Analytics**: Connection quality metrics and usage stats

### Extension Points
- **Custom Heartbeat Intervals**: User-configurable check frequency
- **Notification System**: Alerts for connection issues
- **Backup Strategies**: Fallback brokers for redundancy
- **Integration Webhooks**: External system notifications

## Development Notes

### Key Files
- `src/pages/BrokerIntegration.jsx`: Main integration interface
- `src/components/broker/BrokerSetup.jsx`: Authentication setup
- `src/components/broker/BrokerCallback.jsx`: OAuth callback handler
- `src/api/entities.js`: Data models and storage functions

### Testing
- **Automated Tests**: `comprehensive-test.cjs` validates all routes and APIs
- **Manual Testing**: Use "Check Backend" for live verification
- **Screenshots**: Captured in `screenshots/` directory for visual validation

### Monitoring
- Console logs prefix with emojis for easy identification:
  - 🔄 Heartbeat operations
  - 📋 Configuration loading
  - 🔍 Status checks
  - 💾 Data storage
  - ⚠️ Warnings and issues

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: QuantumLeap Trading Team 