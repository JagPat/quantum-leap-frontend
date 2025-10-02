#!/bin/bash
# Quick OAuth Authentication Verification Script

echo "🔍 OAuth Authentication Verification"
echo "====================================="
echo ""

# Check if config_id is provided
if [ -z "$1" ]; then
    echo "Usage: ./verify_auth.sh <config_id>"
    echo ""
    echo "Example:"
    echo "  ./verify_auth.sh d2451ed9-1ea3-4b67-9529-5756922b388d"
    echo ""
    echo "Get your config_id from browser console after authentication:"
    echo "  JSON.parse(localStorage.getItem('activeBrokerSession')).config_id"
    exit 1
fi

CONFIG_ID=$1
BACKEND_URL="https://web-production-de0bc.up.railway.app"

echo "Config ID: $CONFIG_ID"
echo ""

# 1. Check backend health
echo "1️⃣  Checking backend health..."
HEALTH=$(curl -s "$BACKEND_URL/health")
UPTIME=$(echo $HEALTH | python3 -c "import sys, json; d=json.load(sys.stdin); print(int(d['uptime']/60))" 2>/dev/null)
echo "   Backend uptime: ${UPTIME}m"
echo ""

# 2. Check session
echo "2️⃣  Checking session data..."
SESSION=$(curl -s "$BACKEND_URL/api/modules/auth/broker/session?config_id=$CONFIG_ID")
echo "$SESSION" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if d.get('status') == 'success':
        data = d['data']
        has_token = data.get('access_token') is not None and data.get('access_token') != ''
        has_user = data.get('user_data') is not None
        token_status = data.get('token_status', {}).get('status', 'unknown')
        needs_reauth = data.get('token_status', {}).get('needsReauth', True)
        
        print(f'   ✓ access_token: {'✅ Present' if has_token else '❌ Missing'}')
        print(f'   ✓ user_data: {'✅ Present' if has_user else '❌ Missing'}')
        if has_user:
            print(f'     - user_id: {data['user_data'].get('user_id', 'N/A')}')
        print(f'   ✓ token_status: {token_status}')
        print(f'   ✓ needsReauth: {needs_reauth}')
        print('')
        
        if has_token and not needs_reauth and token_status == 'valid':
            print('✅ SESSION VALID - Authentication successful!')
        else:
            print('❌ SESSION INVALID - Authentication failed')
            print('')
            print('Debug: Full response:')
            print(json.dumps(d, indent=2))
    else:
        print('❌ Error fetching session:', d.get('error', 'Unknown error'))
except:
    print('❌ Failed to parse response')
    print(sys.stdin.read())
"
echo ""

# 3. Check status endpoint
echo "3️⃣  Checking connection status..."
STATUS=$(curl -s "$BACKEND_URL/api/modules/auth/broker/status?config_id=$CONFIG_ID")
echo "$STATUS" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if d.get('success'):
        data = d['data']
        is_connected = data.get('isConnected', False)
        needs_reauth = data.get('needsReauth', True)
        state = data.get('connectionStatus', {}).get('state', 'unknown')
        
        print(f'   ✓ isConnected: {is_connected}')
        print(f'   ✓ needsReauth: {needs_reauth}')
        print(f'   ✓ state: {state}')
        print('')
        
        if is_connected and not needs_reauth:
            print('✅ CONNECTION STATUS VALID')
        else:
            print('❌ CONNECTION STATUS INVALID')
    else:
        print('❌ Error:', d.get('error', 'Unknown'))
except:
    print('❌ Failed to parse response')
"
echo ""

# 4. Summary
echo "====================================="
echo "Verification complete!"
echo ""
echo "Next steps:"
echo "1. Check frontend: localStorage.getItem('activeBrokerSession')"
echo "2. Test portfolio fetch from /settings page"
echo ""

