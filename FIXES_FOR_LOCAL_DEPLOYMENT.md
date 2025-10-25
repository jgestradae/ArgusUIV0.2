# Fixes for Local Windows Deployment

## Issue 1: Login Fails from External IP/Computer

### Problem:
When accessing ArgusUI from another computer using the server's IP address (e.g., `http://172.23.80.236:3000`), login fails.

### Root Cause:
The frontend `.env` file has `REACT_APP_BACKEND_URL=http://localhost:8001`, which only works on the server itself, not from external computers.

### Solution:

**On your Windows server**, update the frontend `.env` file:

**File:** `C:\ArgusUI\ArgusUIv0.2\frontend\.env`

**Change from:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Change to:**
```env
REACT_APP_BACKEND_URL=http://172.23.80.236:8001
```

Replace `172.23.80.236` with your actual server IP address.

**After changing:**
1. Stop services: `scripts\stop-argusui.bat`
2. Start services: `scripts\run-argusui-fixed.bat`

### Verification:
- From same computer: `http://172.23.80.236:3000`
- From another computer: `http://172.23.80.236:3000`
- Both should now work!

---

## Issue 2: GSS Not Auto-Requested on Startup

### Problem:
GSS request is only sent when user visits System Status page manually.

### Solution:
This will be fixed in the code update. The backend will:
1. Send initial GSS on startup
2. Check for responses every 30 seconds
3. Send new GSS only if no recent response (< 5 minutes old)

**No manual action needed** - will be included in the code update.

---

## Issue 3: Timing Definition Improvements

### Problem:
Current timing options don't work well and don't match Argus AMM interface.

### Solution:
The timing interface will be redesigned to match Argus:
- **Siempre** (Always running)
- **Span** (Time span with start/end dates and times)
- **Periódico** (Periodic with daily times and day-of-week selection)
- **Fragmentación** (Fragmentation with interval/duration)

**No manual action needed** - will be included in the code update.

---

## Issue 4: Remote Connection Module

### Problem:
Need a centralized place to manage station connections and GSP requests.

### Solution:
A new "Remote Connection" tab will be added:
- Lists all stations from GSS
- Send GSS/GSP requests per station
- Store system parameters for each station
- Use in Direct Measurement mode

**No manual action needed** - will be included in the code update.

---

## Summary of Actions You Need to Take:

### **NOW (Before Code Update):**

1. **Update frontend `.env`:**
   ```batch
   cd C:\ArgusUI\ArgusUIv0.2\frontend
   notepad .env
   ```
   
   Change:
   ```env
   REACT_APP_BACKEND_URL=http://YOUR_SERVER_IP:8001
   ```
   
   Save and close.

2. **Restart services:**
   ```batch
   cd C:\ArgusUI\ArgusUIv0.2\scripts
   stop-argusui.bat
   run-argusui-fixed.bat
   ```

3. **Test from another computer:**
   - Open browser on different PC
   - Go to `http://YOUR_SERVER_IP:3000`
   - Login should now work!

### **LATER (After Code Update from GitHub):**

1. Pull latest code
2. Restart services
3. Test new features:
   - Auto GSS on startup
   - Improved timing definition
   - Remote Connection Module

---

## Network Configuration Tips

### Windows Firewall:
Make sure ports are open:
```batch
netsh advfirewall firewall add rule name="ArgusUI Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="ArgusUI Backend" dir=in action=allow protocol=TCP localport=8001
```

### Check Server IP:
```batch
ipconfig
```
Look for "IPv4 Address" under your network adapter.

---

## Troubleshooting

### Login Still Fails:
1. Check browser console (F12) for errors
2. Verify backend is accessible: `http://YOUR_SERVER_IP:8001/api/health`
3. Check CORS_ORIGINS in `backend\.env` includes your IP

### Can't Access from External PC:
1. Verify firewall rules are active
2. Test network connectivity: `ping YOUR_SERVER_IP`
3. Check if antivirus is blocking connections
