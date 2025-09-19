# Implementation Plan

- [x] 1. Set up backend OAuth infrastructure and security foundations
  - Create secure token storage utilities with encryption/decryption functions
  - Implement database schema for broker configs and OAuth tokens
  - Set up environment variables for OAuth security keys
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement core OAuth controller endpoints
  - Create OAuth controller with setup-oauth endpoint that validates credentials and generates OAuth URLs
  - Implement OAuth callback endpoint to handle authorization codes and exchange for tokens
  - Add token refresh endpoint with automatic refresh logic
  - Write disconnect endpoint that revokes tokens and cleans up stored data
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 5.1, 5.2_

- [x] 3. Build Zerodha Kite Connect API client integration
  - Implement Kite Connect API client with OAuth URL generation
  - Add token exchange functionality for converting request tokens to access tokens
  - Create token refresh mechanism using Kite Connect refresh token flow
  - Implement session revocation for proper disconnection
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 5.1_

- [x] 4. Create secure token management service
  - Build token manager with encrypted storage and retrieval of OAuth tokens
  - Implement automatic token refresh logic with expiration checking
  - Add token validation and cleanup utilities
  - Create secure credential storage for API keys and secrets
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2_

- [x] 5. Implement backend broker configuration management
  - Create broker config CRUD operations with secure credential handling
  - Add connection status tracking and real-time updates
  - Implement broker config validation and error handling
  - Build status check endpoint for real-time connection monitoring
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 6. Update existing backend OAuth endpoints to use new implementation
  - Replace mock OAuth endpoints in server-modular-safe.js with real implementation
  - Update CORS configuration to handle OAuth callback redirects
  - Add proper error handling and logging for OAuth operations
  - Integrate new OAuth controller with existing Express app
  - _Requirements: 1.3, 1.4, 3.4, 6.4_

- [x] 7. Create frontend broker configuration Redux store
  - Implement Redux slice for broker configuration state management
  - Add action creators for OAuth flow, connection status, and error handling
  - Create selectors for accessing broker state and connection status
  - Write reducers for handling OAuth flow state transitions
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Build frontend OAuth service layer
  - Update existing brokerAPI service to use new OAuth endpoints
  - Implement OAuth flow initiation with popup window handling
  - Add automatic token refresh logic in frontend service
  - Create connection status polling and real-time updates
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.1, 4.2_

- [x] 9. Create broker setup UI components
  - Build BrokerSetup component for credential input and OAuth initiation
  - Implement credential validation with real-time feedback
  - Add OAuth flow UI with loading states and error handling
  - Create connection status display with reconnection controls
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 10. Implement OAuth callback handling
  - Create OAuth callback page to handle authorization code from Zerodha
  - Implement secure communication between callback page and main application
  - Add error handling for OAuth authorization failures
  - Build success/failure feedback for completed OAuth flow
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 11. Add connection management features
  - Implement disconnect functionality with token revocation
  - Create connection status monitoring with automatic reconnection
  - Add error recovery mechanisms for failed connections
  - Build connection health checks and status updates
  - _Requirements: 3.3, 3.4, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 12. Integrate OAuth system with existing portfolio features
  - Update portfolio service to use authenticated broker connections
  - Modify existing mock portfolio endpoints to use real broker data when connected
  - Add fallback to mock data when broker is disconnected
  - Implement real-time portfolio updates using OAuth-authenticated API calls
  - _Requirements: 1.1, 3.1, 4.1_

- [x] 13. Add comprehensive error handling and user feedback
  - Implement user-friendly error messages for all OAuth failure scenarios
  - Add retry mechanisms for transient connection failures
  - Create detailed logging for OAuth operations and errors
  - Build error recovery workflows for expired or invalid tokens
  - _Requirements: 1.4, 2.3, 3.3, 4.3, 5.3, 6.4_

- [x] 14. Write comprehensive tests for OAuth implementation
  - Create unit tests for OAuth controller endpoints and token management
  - Write integration tests for complete OAuth flow end-to-end
  - Add frontend component tests for broker setup and connection status
  - Implement mock Zerodha API responses for testing OAuth scenarios
  - _Requirements: All requirements - testing coverage_

- [x] 15. Add security hardening and production readiness
  - Implement rate limiting for OAuth endpoints to prevent abuse
  - Add CSRF protection for OAuth callback handling
  - Create secure logging that excludes sensitive credential data
  - Implement proper error responses that don't leak sensitive information
  - _Requirements: 6.1, 6.2, 6.3, 6.4_