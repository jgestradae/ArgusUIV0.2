# Argus XML Format Updates - v0.2.1

## Changes Made (October 24, 2025)

### 1. XML Format Corrections

Updated XML generation to match Argus specifications based on working example:

#### Root Element
- **Before**: `<order_def>`
- **After**: `<XMLSchema1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`

#### Element Names (Changed to UPPERCASE)
- `order_def` → `ORDER_DEF`
- `order_id` → `ORDER_ID`
- `order_type` → `ORDER_TYPE`
- `order_name` → `ORDER_NAME`
- `order_sender` → `ORDER_SENDER`
- `order_state` → `ORDER_STATE`
- `order_creator` → `ORDER_CREATOR`
- `execution_type` → `EXECUTION_TYPE`
- `order_ver` → `ORDER_VER`

#### New Required Fields
- **`ORDER_SENDER_PC`**: Added sender PC name (default: "SRVARGUS")

#### Field Value Updates
- **`ORDER_SENDER`**: Changed from "ArgusUI" to "HQ4" (control station name)
- **`ORDER_CREATOR`**: Changed from "External" to "Extern"
- **`ORDER_NAME`**: Removed spaces (e.g., "SystemStateQuery" instead of "System State Query")

### 2. Order ID Format

**Before**: `ARGUSUI_20251024_145623_a1b2c3d4`

**After**: `GSS251024145623000` 

Format: `[PREFIX][DDMMYY][HHMMSS][XXX]`
- PREFIX: Order type (GSS, GSP, OR, etc.)
- DDMMYY: Date in day-month-year format
- HHMMSS: Time in hour-minute-second format
- XXX: Milliseconds (3 digits)

### 3. Configuration Variables

Added to `backend/.env`:
```env
# Argus Control Station Configuration
ARGUS_CONTROL_STATION=HQ4
ARGUS_SENDER_PC=SRVARGUS
```

These can be customized per deployment without code changes.

### 4. Polling Frequency

**System Status (GSS) queries:**
- **Before**: Every 15 seconds
- **After**: Every 60 seconds (1 minute)

**Reason**: GSS queries are resource-intensive on Argus system.

---

## Example: Correct GSS XML Format

```xml
<?xml version="1.0" encoding="utf-8"?>
<XMLSchema1 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ORDER_DEF>
    <ORDER_ID>GSS251024060810000</ORDER_ID>
    <ORDER_TYPE>GSS</ORDER_TYPE>
    <ORDER_NAME>SystemStateQuery</ORDER_NAME>
    <ORDER_SENDER>HQ4</ORDER_SENDER>
    <ORDER_SENDER_PC>SRVARGUS</ORDER_SENDER_PC>
    <ORDER_STATE>Open</ORDER_STATE>
    <ORDER_CREATOR>Extern</ORDER_CREATOR>
    <EXECUTION_TYPE>A</EXECUTION_TYPE>
    <ORDER_VER>200</ORDER_VER>
  </ORDER_DEF>
</XMLSchema1>
```

---

## Files Modified

1. **`/app/backend/xml_processor.py`**
   - Updated `create_system_state_request()` method
   - Updated `create_system_params_request()` method
   - Updated `generate_order_id()` method
   - Added parameters for control station and sender PC

2. **`/app/backend/server.py`**
   - Added environment variable reading for ARGUS_CONTROL_STATION
   - Added environment variable reading for ARGUS_SENDER_PC
   - Updated GSS and GSP endpoints to pass configuration

3. **`/app/backend/.env`**
   - Added ARGUS_CONTROL_STATION configuration
   - Added ARGUS_SENDER_PC configuration

4. **`/app/frontend/src/components/SystemStatus.js`**
   - Changed polling interval from 15000ms to 60000ms

5. **`/app/frontend/public/index.html`**
   - Changed page title to "ArgusUI - Spectrum Monitoring Control"

---

## Testing Recommendations

1. **Verify XML Generation**: Check that new XML files in inbox folder match the correct format
2. **Monitor Argus Response**: Confirm Argus processes requests and generates responses in outbox
3. **Test All Order Types**: Ensure GSS, GSP, and OR (measurement) orders work correctly
4. **Check Timing**: Verify 60-second polling interval is appropriate for your system

---

## Future Enhancements

Consider updating other order types (OR - measurements) to use the same XML format structure if needed.
