# Railway Environment Variables Setup

## Required Environment Variables for OAuth Integration

Add these environment variables in Railway dashboard:

### Core Security
```
OAUTH_ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here-64-chars-long-minimum
NODE_ENV=production
```

### JWT Authentication  
```
JWT_SECRET=your-jwt-secret-key-here-minimum-32-characters-long
AUTH_JWT_TTL=12h
```

### OTP Configuration
```
AUTH_OTP_PEPPER=your-otp-pepper-secret-here-minimum-32-characters
AUTH_OTP_CHANNELS=email
ALLOW_SELF_SIGNUP=false
```

### Zerodha API Configuration
```
ZERODHA_API_BASE_URL=https://api.kite.trade
ZERODHA_LOGIN_URL=https://kite.zerodha.com/connect/login
ZERODHA_REDIRECT_URI=https://your-frontend-domain.com/broker-callback
```

## Generate Secure Keys

### OAUTH_ENCRYPTION_KEY (64 hex characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### JWT_SECRET (minimum 32 characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### AUTH_OTP_PEPPER (minimum 32 characters)  
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```