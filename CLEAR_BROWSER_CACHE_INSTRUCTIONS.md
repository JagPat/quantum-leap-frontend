# Clear Browser Cache Instructions
**Issue:** Blocked origin messages from old Base44 deployment  
**Solution:** Complete browser cache clearing

## Method 1: Chrome DevTools (Recommended)

1. **Open Chrome DevTools**
   - Press `F12` or `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)

2. **Navigate to Application Tab**
   - Click "Application" tab in DevTools

3. **Clear Storage**
   - In left sidebar, click "Storage"
   - Click "Clear site data" button
   - Confirm the action

4. **Additional Cleanup**
   - Go to "Local Storage" → `http://localhost:5173` → Delete all entries
   - Go to "Session Storage" → `http://localhost:5173` → Delete all entries
   - Go to "Cookies" → `http://localhost:5173` → Delete all cookies

## Method 2: Browser Settings

### Chrome/Edge:
1. Go to `chrome://settings/clearBrowserData`
2. Select "All time" from time range
3. Check all boxes:
   - Browsing history
   - Cookies and other site data
   - Cached images and files
4. Click "Clear data"

### Firefox:
1. Go to `about:preferences#privacy`
2. Click "Clear Data" in Cookies and Site Data section
3. Check both boxes and click "Clear"

## Method 3: Incognito/Private Mode (Quick Test)

1. Open a new Incognito/Private browser window
2. Navigate to `http://localhost:5173/broker-integration`
3. Test OAuth flow - should have no Base44 messages

## Method 4: Close All Popup Windows

1. **Check for hidden popup windows**
   - Look in your dock/taskbar for any browser windows
   - Close any windows that might contain `base44.app` URLs

2. **Force close all browser processes**
   - Completely quit your browser
   - Use Task Manager (Windows) or Activity Monitor (Mac) to kill any remaining browser processes
   - Restart browser fresh

## Verification Steps

After clearing cache:

1. Navigate to `http://localhost:5173/broker-integration`
2. Open browser console (F12)
3. Enter your OAuth credentials and start the flow
4. **You should NOT see:** `🚫 Message from blocked origin: "https://preview--quantum-leap-trading-15b08bd5.base44.app"`
5. **You should see:** Only messages from `http://localhost:5173` and `https://web-production-de0bc.up.railway.app`

## Why This Happens

The Base44 messages occur because:
- Old popup windows are still open in background
- Browser cache contains old OAuth flow data
- Local/session storage has cached Base44 URLs
- Service worker cache might have old data

## Expected Behavior After Clearing

✅ **Clean console output** - No Base44 origin messages  
✅ **OAuth popup opens** - Zerodha login page appears  
✅ **Proper callback** - Redirects to localhost:5173/broker-callback  
✅ **Status updates** - UI shows "Connected" after authentication  

If you still see Base44 messages after following ALL steps above, it indicates a deeper caching issue that may require browser restart or system reboot. 