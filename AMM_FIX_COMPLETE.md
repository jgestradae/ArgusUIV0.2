# AMM Creation Fix - Complete

**Date:** October 27, 2025  
**Fix Type:** Option A - Quick Win

---

## ✅ Changes Applied

### 1. **Frontend Data Transformation** (/app/frontend/src/components/AutomaticMode.js)

Added `transformWizardDataToBackend()` function that:
- Converts `wizardData` structure to backend-expected `AMMConfigurationCreate` format
- Generates UUIDs for all definition objects
- Maps all timing, measurement, range, and general configuration properly
- Handles optional fields with defaults

### 2. **Enhanced Error Handling**

Updated `handleCreateAMM()` to:
- Transform data before sending
- Show detailed validation errors from backend
- Log request data for debugging
- Reset wizard after successful creation

### 3. **Fixed API Endpoints**

Corrected all AMM API calls to use proper paths:
- ✅ `/api/amm/configurations` (was `/api/api/amm/configurations`)
- ✅ `/api/amm/dashboard-stats`
- ✅ `/api/amm/executions`
- ✅ `/api/system/available-stations`
- ✅ `/api/amm/configurations/{id}/start`
- ✅ `/api/amm/configurations/{id}/stop`

---

## 📋 Data Transformation Details

### Input (wizardData):
```javascript
{
  selected_station: { name, pc, device_count, ... },
  name: "string",
  description: "string",
  timing: { schedule_type, dates, times, weekdays, ... },
  measurement: { measurement_type, device_name, receiver_config, ... },
  range: { system_path, frequency_start, frequency_end },
  general: { result_config: { ... } }
}
```

### Output (AMMConfigurationCreate):
```javascript
{
  name: "string",
  description: "string",
  timing_definition: {
    id: "uuid",
    schedule_type: "ALWAYS|SPAN|PERIODIC",
    start_date, start_time, end_date, end_time,
    repeat_days: ["monday", "tuesday", ...],
    fragmentation_enabled, ...
    created_at, created_by
  },
  measurement_definition: {
    id: "uuid",
    name, measurement_type, device_name,
    station_names: ["station_pc"],
    frequency_mode, frequency_single,
    receiver_config: { if_bandwidth, rf_attenuation, ... },
    antenna_config: { antenna_name, azimuth, ... },
    measured_parameters, alarm_configs,
    created_at, created_by
  },
  range_definition: {
    id: "uuid",
    system_path, frequency_start, frequency_end,
    created_at, created_by
  },
  general_definition: {
    id: "uuid",
    result_config: { graphic_type, save_measurement_results, ... },
    created_at, created_by
  }
}
```

---

## 🧪 Testing Procedure

### Step 1: Restart Services
```bash
cd C:\ArgusUI\ArgusUIv0.2
.\scripts\stop-argusui.bat
.\scripts\run-argusui.bat
```

This applies **BOTH** fixes:
- ✅ Remote login (.env change)
- ✅ AMM creation (data transformation)

### Step 2: Test Remote Login
From another PC on the network:
1. Open browser: `http://172.23.80.236:3000`
2. Login with: admin/admin123
3. ✅ Should work now

### Step 3: Test AMM Creation
1. Navigate to **Automatic Mode** tab
2. Click **Create New** or go to Wizard tab
3. Complete all wizard steps:
   - **Step 1:** Select a station
   - **Step 2:** Select measurement type (e.g., FLSCAN)
   - **Step 3:** Configure timing
   - **Step 4:** Configure measurement parameters
   - **Step 5:** Review and Submit

4. Click **Submit**

### Step 4: Verify Success

**Expected Results:**
- ✅ Success toast: "AMM configuration created successfully"
- ✅ Dashboard refreshes with new configuration
- ✅ Wizard resets to step 1
- ✅ Configuration appears in dashboard list

**Check MongoDB:**
```bash
mongosh
use test_database
db.amm_configurations.find().pretty()
db.measurement_definitions.find().pretty()
db.timing_definitions.find().pretty()
exit
```

**Check Browser Console (F12):**
- Look for "Sending AMM data:" log
- Verify transformed data structure
- Check for any errors

### Step 5: Check XML Generation

If AMM scheduler is active, check for XML files:
```
C:\ProgramData\Rohde-Schwarz\ARGUS6\Inbox\
```

Look for files like: `OR-251027-143055123-O.xml`

---

## 🐛 Troubleshooting

### Issue: Still Getting "Failed to create AMM configuration"

**Check Browser Console (F12 → Console):**
- Look for the "Sending AMM data:" log
- Check the transformed data structure
- Look for any JavaScript errors

**Check Backend Logs:**
```bash
# In your ArgusUI directory
type backend\logs\*.log | findstr "amm\|error\|exception"
```

**Common Issues:**

1. **Validation Error: "field required"**
   - Check console log to see which field is missing
   - Ensure all wizard steps are completed
   - Verify station is selected in Step 1

2. **Validation Error: "value is not a valid enumeration member"**
   - `schedule_type` must be uppercase: "ALWAYS", "SPAN", or "PERIODIC"
   - `measurement_type` must match backend enum

3. **Backend Connection Error:**
   - Verify backend is running: `http://localhost:8001/docs`
   - Check API constant is correct: `${BACKEND_URL}/api`
   - Test endpoint manually: `curl http://localhost:8001/api/amm/configurations`

### Issue: Data Not Saving to MongoDB

**Verify MongoDB Connection:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

**Check Database Name:**
- Backend .env should have: `DB_NAME="test_database"`
- MongoDB Compass should connect to: `mongodb://localhost:27017`

### Issue: XML Not Generated

**Check AMM Scheduler:**
- AMM configuration must be set to "active" status
- Scheduler must be running
- Check timing definition matches current time

**Manually Trigger:**
- Go to AMM Dashboard
- Find your configuration
- Click "Start" button
- Check logs for execution

---

## 📊 What to Report Back

Please test and let me know:

1. **Remote Login:**
   - ✅ Working / ❌ Still failing
   - If failing: What error message?

2. **AMM Creation:**
   - ✅ Success toast appears
   - ✅ Configuration appears in dashboard
   - ❌ Error message: _____________

3. **MongoDB:**
   - ✅ Data appears in collections
   - ❌ No data / Error: _____________

4. **Browser Console:**
   - Share any errors or warnings
   - Share the "Sending AMM data:" log output

5. **Backend Logs:**
   - Share any error messages
   - Especially around AMM creation time

---

## 🎯 Next Steps After Verification

Once AMM creation is working:

**Phase 2A - Signal Path Enhancement:**
- Replace "Device" field with "Signal Path" dropdown
- Fetch available paths from station GSS data
- Match Argus ORM Step 2

**Phase 2B - Result Type Configuration:**
- Add Step 5 to wizard: Result Type selection
- Options: MR, CMR, MaxHold, ADC
- Result Format: XML, BIN, ADC
- Compression interval
- Alarm thresholds

**Phase 2C - Station Management:**
- Parse Windows hosts file
- Ping utility
- Combined GSS + Ping diagnostics
- Configuration tab for station list

---

## 📞 Support

If issues persist:
1. Share browser console output
2. Share backend logs
3. Share MongoDB query results
4. Take screenshots of error messages

We'll troubleshoot together!

---

**End of AMM Fix Documentation**
