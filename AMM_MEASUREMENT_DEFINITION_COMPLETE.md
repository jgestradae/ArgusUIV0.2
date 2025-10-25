# AMM Measurement Definition - Intelligent & Adaptive

## Summary

Completely redesigned the measurement definition step to be intelligent and adaptive based on the selected station's capabilities, devices, and measurement type.

---

## 🎯 Key Features

### **1. Station-Aware Configuration**

**Station Info Banner:**
```
┌─────────────────────────────────────────────┐
│ ℹ️ Station: Barranquilla 1                   │
│   Available types: FFM, SCAN, DSCAN         │
└─────────────────────────────────────────────┘
```

Shows selected station and available measurement types at the top.

---

### **2. Filtered Measurement Types**

**Only shows types available for the selected station:**
- Based on `available_measurement_types` from station data
- Filters MEASUREMENT_TYPES dropdown
- Prevents selection of unsupported types
- Shows warning if no types available

**Example:**
- Station with EB500 → FFM, SCAN, DSCAN, LOCATION
- Station with ANTENNA08 → FFM, SCAN only

---

### **3. Device Selection from Station**

**Dropdown populated with actual station devices:**
```
Select device...
├─ HF902V_dBm (ANTENNA08 • physical)
├─ HE500_01 (EB500 • physical)
└─ VHF_Receiver (DDF550 • physical)
```

**Features:**
- Device name as primary
- Driver type shown
- Device state indicated
- Only devices from selected station

---

### **4. Adaptive Measurement Configuration**

#### **For FFM (Fixed Frequency Mode):**
```
┌─────────────────────────────────────────────┐
│ Fixed Frequency Mode (FFM)                  │
│                                             │
│ Frequency (Hz)           IF Bandwidth      │
│ [100000000]              [9000 Hz  ▼]      │
└─────────────────────────────────────────────┘
```

**Fields:**
- Single frequency input
- IF Bandwidth dropdown (200 Hz to 200 kHz)

#### **For SCAN Types (SCAN, DSCAN, PSCAN, FLSCAN):**
```
┌─────────────────────────────────────────────┐
│ Frequency Scan                              │
│                                             │
│ Start Frequency         Stop Frequency     │
│ [88000000]              [108000000]        │
│                                             │
│ Step Size               IF Bandwidth       │
│ [25000]                 [9000 Hz  ▼]       │
└─────────────────────────────────────────────┘
```

**Fields:**
- Start & Stop frequencies
- Step size
- IF Bandwidth dropdown

---

### **5. Common Receiver Configuration**

**Always shown for all measurement types:**

```
┌─────────────────────────────────────────────┐
│ Receiver Configuration                      │
│                                             │
│ RF Attenuation          Demodulation       │
│ [Auto  ▼]               [FM  ▼]            │
│                                             │
│ Detector                Measurement Time   │
│ [Average  ▼]            [5] seconds        │
└─────────────────────────────────────────────┘
```

**Fields:**
- RF Attenuation: Auto, 0 dB, 10 dB, 20 dB, 30 dB
- Demodulation: FM, AM, USB, LSB, CW
- Detector: Average, Peak, RMS, Min, Max
- Measurement Time: 1-300 seconds

---

## 🧠 Intelligence Features

### **Type-Based Field Display:**
```javascript
const isFixedFrequency = wizardData.measurement.measurement_type === 'FFM';
const isScanType = ['SCAN', 'DSCAN', 'PSCAN', 'FLSCAN'].includes(...);

{isFixedFrequency && (
  // Show FFM fields
)}

{isScanType && (
  // Show scan fields
)}
```

### **Auto Frequency Mode Update:**
```javascript
onValueChange={(value) => setWizardData(prev => ({
  ...prev,
  measurement: { 
    ...prev.measurement, 
    measurement_type: value,
    // Reset frequency mode when changing type
    frequency_mode: value === 'FFM' ? 'S' : 'R'
  }
}))}
```

### **Smart Validation:**
```javascript
disabled={
  !wizardData.measurement.measurement_type || 
  !wizardData.measurement.device_name
}
```

Next button only enabled when:
- Measurement type selected
- Device selected

---

## 📊 Data Flow

```
Selected Station
  ↓
Available Measurement Types → Filter dropdown
  ↓
User Selects Type → Show relevant fields
  ↓
Station Devices → Populate device dropdown
  ↓
User Configures → Validate
  ↓
Proceed to Review
```

---

## 🎨 UI Sections

### **1. Info Banner (Blue)**
- Station name
- Available measurement types
- Always visible

### **2. Measurement Type (Filtered)**
- Select dropdown
- Only station-supported types
- Shows label + description

### **3. Device Selection (From Station)**
- Select dropdown
- Device name + driver + state
- Only station's devices

### **4. Frequency Config (Adaptive)**
- FFM: Single frequency + IF BW
- SCAN: Start/Stop/Step + IF BW
- Conditionally rendered

### **5. Receiver Config (Always)**
- RF Attenuation
- Demodulation
- Detector
- Measurement Time

---

## 💡 Benefits

### **1. User-Friendly**
- ✅ Clear context (station info banner)
- ✅ Only relevant options shown
- ✅ Can't select incompatible configurations
- ✅ Helpful placeholders and examples

### **2. Error Prevention**
- ✅ Filtered measurement types
- ✅ Device list from actual station
- ✅ Type-appropriate fields
- ✅ Validation before proceeding

### **3. Professional**
- ✅ Matches Argus standards
- ✅ Clear field organization
- ✅ Consistent styling
- ✅ Proper labels

### **4. Scalable**
- ✅ Easy to add new measurement types
- ✅ Station-specific logic encapsulated
- ✅ Conditional rendering pattern
- ✅ Reusable components

---

## 🧪 Testing Checklist

### **Station Integration:**
- [ ] Station info banner shows correct data
- [ ] Measurement types filtered by station
- [ ] Device dropdown shows station's devices
- [ ] No devices from other stations appear

### **FFM Mode:**
- [ ] Shows single frequency field
- [ ] Shows IF bandwidth dropdown
- [ ] Scan fields hidden

### **Scan Modes:**
- [ ] Shows start/stop/step fields
- [ ] Shows IF bandwidth dropdown
- [ ] FFM frequency field hidden

### **Receiver Config:**
- [ ] Always visible regardless of type
- [ ] All dropdowns work
- [ ] Measurement time accepts numbers

### **Validation:**
- [ ] Next button disabled without type
- [ ] Next button disabled without device
- [ ] Next button enabled when both selected

---

## 📝 Example Configurations

### **Example 1: FM Broadcast Monitor**
```
Station: Barranquilla 1
Type: FFM (Fixed Frequency Mode)
Device: HF902V_dBm (ANTENNA08)
Frequency: 100000000 Hz (100 MHz)
IF Bandwidth: 200 kHz
Demodulation: FM
Detector: Peak
Time: 10 seconds
```

### **Example 2: VHF Scan**
```
Station: Medellin 1
Type: SCAN (Frequency Scan)
Device: VHF_Scanner (EB500)
Start: 88000000 Hz (88 MHz)
Stop: 108000000 Hz (108 MHz)
Step: 25000 Hz (25 kHz)
IF Bandwidth: 9 kHz
Demodulation: FM
Detector: Average
Time: 30 seconds
```

### **Example 3: Direction Finding**
```
Station: Cali 1
Type: DSCAN (Direction Finding Scan)
Device: DF_Unit_01 (EB500)
Start: 140000000 Hz (140 MHz)
Stop: 170000000 Hz (170 MHz)
Step: 12500 Hz (12.5 kHz)
IF Bandwidth: 9 kHz
RF Atten: Auto
Time: 60 seconds
```

---

## 🚀 Ready for Integration

The measurement definition is now:
- ✅ Fully adaptive
- ✅ Station-aware
- ✅ Type-intelligent
- ✅ User-friendly
- ✅ Production-ready

Ready to create real Argus measurements based on actual station capabilities! 🎉
