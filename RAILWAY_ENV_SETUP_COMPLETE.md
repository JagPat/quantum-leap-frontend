# Complete Railway Environment Variables Setup

## 🚀 Set These Environment Variables in Railway Dashboard

Go to your Railway project → Settings → Environment Variables and add these:

### 🔐 Security Keys (Generated for you)
```
OAUTH_ENCRYPTION_KEY=79ff0d836b97b952bc10269dad6ffc9a6ca503647ee3431ca76bc1d0d3fe376b
JWT_SECRET=Uu4nCRBBMFMM+BH7E0lwRsHNswTpG2IqoFdNUE664rQ=
AUTH_OTP_PEPPER=UnjKpxWdOrGhsZIRrOwCt+PPvxcMg9K2rYEkP/2+1vI=
```

### 🏢 Zerodha API Configuration
```
ZERODHA_API_KEY=YOUR_API_KEY_FROM_KITE_CONNECT_APP
ZERODHA_API_SECRET=YOUR_API_SECRET_FROM_KITE_CONNECT_APP
ZERODHA_REDIRECT_URI=https://web-production-de0bc.up.railway.app/api/modules/auth/broker/callback
```

### ⚙️ Application Settings
```
NODE_ENV=production
AUTH_JWT_TTL=12h
AUTH_OTP_CHANNELS=email
ALLOW_SELF_SIGNUP=false
ZERODHA_API_BASE_URL=https://api.kite.trade
ZERODHA_LOGIN_URL=https://kite.zerodha.com/connect/login
```

## 📝 Steps to Add Environment Variables

1. **Go to Railway Dashboard**
   - Open https://railway.app/dashboard
   - Select your `quantumleap-trading-backend` project

2. **Navigate to Environment Variables**
   - Click on your backend service
   - Go to "Variables" tab
   - Click "New Variable"

3. **Add Each Variable**
   - Copy each variable name and value from above
   - Click "Add" for each one

4. **Get Your Kite Connect Credentials**
   From your Kite Connect app (shown in screenshot):
   - Copy the **API Key** (visible in your screenshot)
   - Copy the **API Secret** (click "Show API secret" if needed)

5. **Deploy**
   - After adding all variables, Railway will automatically redeploy
   - Wait for deployment to complete (~2-3 minutes)

## 🧪 Verification

After setting up the environment variables, run this to verify:

```bash
node verify-oauth-deployment.cjs
```

You should see:
- ✅ Auth module loaded successfully
- ✅ OAuth endpoints available
- ✅ All systems operational

## 🔍 What These Variables Do

- **OAUTH_ENCRYPTION_KEY**: Encrypts OAuth tokens in database
- **JWT_SECRET**: Signs JWT authentication tokens  
- **AUTH_OTP_PEPPER**: Adds security to OTP generation
- **ZERODHA_API_KEY/SECRET**: Your Kite Connect app credentials
- **ZERODHA_REDIRECT_URI**: Where Zerodha redirects after OAuth
- **NODE_ENV**: Sets production mode
- **AUTH_JWT_TTL**: JWT token expiration time
- **AUTH_OTP_CHANNELS**: How OTPs are sent (email)
- **ALLOW_SELF_SIGNUP**: Prevents unauthorized signups

## ⚠️ Important Notes

1. **Keep credentials secure** - Never commit these to git
2. **API Secret** - Make sure to copy the correct secret from Kite Connect
3. **Redirect URI** - Must match exactly what's in your Kite Connect app
4. **Deployment** - Railway will redeploy automatically after adding variables

## 🆘 If You Need Help

If you can't find your API Secret in the Kite Connect dashboard:
1. Go to https://developers.kite.trade/apps
2. Click on your "quantum-leap" app
3. Click "Show API secret" button
4. Copy the secret value