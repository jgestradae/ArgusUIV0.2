# AMM Workflow Enhancement - Station Selection Integration

## Summary

Enhanced the Automatic Mode (AMM) workflow to integrate real-time station selection based on Argus System Status (GSS) data.

---

## 🎯 What Changed

### **New 5-Step Wizard Workflow:**

**Previous (4 steps):**
1. Basic Information
2. Timing Definition
3. Measurement Definition
4. Review & Create

**New (5 steps):**
1. **Select Monitoring Station** ← NEW
2. Basic Information
3. Timing Definition
4. Measurement Definition
5. Review & Create

---

## 🔧 Technical Implementation

### **Backend Changes:**

#### 1. **New API Endpoint** (`/api/system/available-stations`)
- Fetches latest system state from database (GSS data)
- Filters only **online stations** (MSS_RUN = "Y")
- Returns station info with:
  - Station name, PC, type
  - Device list and count
  - Available measurement types (based on devices)
  - Geographic coordinates

#### 2. **Measurement Type Mapping**
Maps device drivers to their capabilities:
```python
driver_capabilities = {
    "EB500": ["FFM", "SCAN", "DSCAN", "LOCATION"],
    "DDF550": ["FFM", "SCAN", "DSCAN"],
    "ANTENNA08": ["FFM", "SCAN"],
    "ZS12x": ["FFM", "SCAN"],
    "S_UMS300": ["FFM", "SCAN", "PSCAN"],
    ...
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "stations": [
      {
        "name": "Barranquilla 1",
        "pc": "ANEDK-024",
        "type": "F",
        "device_count": 21,
        "devices": [...],
        "coordinates": {
          "latitude": 10.886806,
          "longitude": -74.774278
        },
        "available_measurement_types": ["FFM", "SCAN", "DSCAN"]
      }
    ]
  }
}
```

---

### **Frontend Changes:**

#### 1. **New Step 1: Station Selection**
- Displays all online stations from GSS
- Shows station details:
  - Name and PC identifier
  - Device count
  - Available measurement types (badges)
- Click to select station
- "Refresh Stations" button to reload
- Visual feedback (cyan border/background when selected)

#### 2. **Updated Wizard State**
```javascript
const [wizardData, setWizardData] = useState({
  selected_station: null,  // NEW
  name: '',
  description: '',
  timing: {...},
  measurement: {...},
  ...
});
```

#### 3. **Auto-Load Stations**
```javascript
useEffect(() => {
  if (activeTab === 'wizard' && wizardStep === 1) {
    loadAvailableStations();
  }
}, [activeTab, wizardStep]);
```

#### 4. **Updated All Navigation**
- All "Previous/Next" buttons updated to new step numbers
- Step indicators show 5 steps
- Review page shows selected station info

---

## 🎨 User Experience

### **Station Selection Screen:**

**When Online Stations Available:**
```
┌─────────────────────────────────────────┐
│ Barranquilla 1                      [✓] │
│ ANEDK-024 • 21 devices                  │
│ [FFM] [SCAN] [DSCAN]                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Cali 1                              [ ] │
│ ANEDK-104 • 21 devices                  │
│ [FFM] [SCAN]                            │
└─────────────────────────────────────────┘
```

**When No Stations Available:**
```
🔍 No online stations available
   [Refresh Stations]
```

---

## 💡 Benefits

### 1. **Intelligent Station Selection**
- Only shows **online** stations ready for measurements
- Displays available capabilities per station
- Prevents configuration errors (selecting offline stations)

### 2. **Context-Aware Workflow**
- Step 2 (Basic Info) shows: "Configuration on [Station Name]"
- Step 4 (Measurement) can filter devices by selected station
- Review page includes station details

### 3. **Real-Time Data**
- Uses latest GSS response
- Shows current system state
- Refresh button for manual updates

### 4. **User-Friendly**
- Visual badges for measurement types
- Clear device counts
- Station status from System Status module

---

## 🔄 Data Flow

```
1. User clicks "Create AMM Configuration"
   ↓
2. Opens Wizard → Step 1 (Station Selection)
   ↓
3. Frontend calls GET /api/system/available-stations
   ↓
4. Backend queries latest system_states from MongoDB
   ↓
5. Filters stations where running=true
   ↓
6. Maps devices → available measurement types
   ↓
7. Returns station list to frontend
   ↓
8. User selects station → Proceeds to Step 2
```

---

## 📝 Future Enhancements

### **Step 4 (Measurement Definition) - Coming Next:**
- Filter device list by selected station
- Show only measurement types available for that station
- Pre-populate station name in measurement config
- Validate device selection against station's devices

### **Station Capabilities:**
- Parse GSP responses for more detailed capabilities
- Show frequency ranges per station
- Display antenna configurations
- Show measurement limitations

---

## 🚀 Testing

### **To Test Locally:**

1. **Ensure System Status has data:**
   - Go to System Status
   - Wait for GSS response to populate stations

2. **Open AMM Wizard:**
   - Navigate to Automatic Mode
   - Click "AMM Wizard" tab
   - Should see online stations listed

3. **Select a Station:**
   - Click on any online station
   - See cyan highlight
   - Click "Next: Basic Information"

4. **Verify Station Context:**
   - Step 2 should mention selected station
   - Continue through wizard
   - Review page should show station details

---

## 📦 Files Modified

### Backend:
1. `/app/backend/server.py`
   - Added `get_available_stations()` endpoint
   - Added `_get_measurement_types_for_station()` helper

### Frontend:
2. `/app/frontend/src/components/AutomaticMode.js`
   - Added Step 1: Station Selection
   - Updated all step numbers (2→3, 3→4, 4→5)
   - Added `loadAvailableStations()` function
   - Added `selected_station` to wizard state
   - Updated navigation buttons throughout
   - Added RefreshCw icon import

---

## ✅ Ready for Deployment

The enhanced AMM workflow is ready to sync to your local Windows machine. When you have real GSS data from your Argus system, the station selection will populate automatically with your actual monitoring stations!
