# Geolocation Mapping Module - Specification

## 📍 Overview

A comprehensive geolocation and mapping module for ArgusUI to visualize monitoring stations, measurement results, and direction finding data.

---

## 🎯 Requirements

### **1. Station Positioning**
- Display remote stations on map using coordinates from GSP
- Show station status (online/offline) with color coding
- Display station info in popups (name, devices, status)
- Support multiple monitoring stations across geographic area

### **2. Radio Location Visualization**

#### **ALA Mode (Angle of Arrival / Bearing)**
- Draw bearing lines from stations at specific angles
- Show intersection points (likely transmitter location)
- Display bearing confidence/accuracy
- Multiple bearing lines from different stations
- Calculate and show intersection areas

#### **TDOA Mode (Time Difference of Arrival)**
- Draw hyperbolas between station pairs
- Show TDOA curves based on time differences
- Display intersection areas (most likely transmitter location)
- Confidence ellipses around calculated positions
- Support multiple station combinations

### **3. Base Map Support**
- **OpenStreetMap** (default, free)
- **Google Maps** (optional, requires API key)
- Switchable between map providers
- Support for satellite/hybrid views

### **4. Layer Management**
- Toggle individual layers on/off
- Stations layer
- ALA/Bearing layer
- TDOA/Hyperbola layer
- Custom icons layer
- Measurement results layer

### **5. Additional Features**
- Custom icons for different equipment types
- Measurement result markers
- Search/filter stations
- Zoom to station/measurement
- Distance/bearing tools
- Export map as image

---

## 🛠️ Technology Stack

### **Frontend Libraries:**
```json
{
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "@turf/turf": "^6.5.0",
  "leaflet-geosearch": "^3.11.0"
}
```

**Why Leaflet?**
- ✅ Lightweight (39KB)
- ✅ Excellent React support
- ✅ Native OpenStreetMap support
- ✅ Google Maps plugin available
- ✅ Extensive plugin ecosystem
- ✅ Free and open source

**Turf.js Benefits:**
- ✅ Bearing calculations
- ✅ Great circle math
- ✅ Intersection calculations
- ✅ Hyperbola generation
- ✅ Distance/area calculations

---

## 📐 Mathematical Components

### **ALA/Bearing Calculations**
```javascript
// Calculate bearing line from station
function calculateBearingLine(stationCoords, bearing, distance) {
  const destination = turf.destination(
    stationCoords,
    distance,
    bearing,
    { units: 'kilometers' }
  );
  return turf.lineString([stationCoords, destination.geometry.coordinates]);
}

// Find intersection of multiple bearing lines
function findBearingIntersection(bearings) {
  // Use least squares method
  // Return most likely transmitter location
}
```

### **TDOA Hyperbola Generation**
```javascript
// Generate hyperbola between two stations
function generateTDOAHyperbola(station1, station2, timeDiff) {
  const c = 299792458; // Speed of light (m/s)
  const distDiff = timeDiff * c;
  
  // Calculate hyperbola parameters
  const a = distDiff / 2;
  const focusDistance = turf.distance(station1, station2, { units: 'meters' });
  const c_dist = focusDistance / 2;
  const b = Math.sqrt(c_dist * c_dist - a * a);
  
  // Generate hyperbola points
  const points = [];
  for (let angle = -Math.PI; angle <= Math.PI; angle += 0.01) {
    // Parametric hyperbola equations
    const x = a * Math.cosh(angle);
    const y = b * Math.sinh(angle);
    
    // Transform to geographic coordinates
    const point = transformToGeo(x, y, station1, station2);
    points.push(point);
  }
  
  return turf.lineString(points);
}
```

---

## 🗺️ Component Structure

### **Main Component: GeolocationMap.js**
```jsx
<GeolocationMap>
  <MapContainer>
    <BaseMapLayer type={mapType} /> {/* OSM or Google */}
    <StationLayer stations={stations} />
    <ALALayer bearings={alaData} visible={showALA} />
    <TDOALayer hyperbolas={tdoaData} visible={showTDOA} />
    <MeasurementLayer results={measurements} />
    <MapControls>
      <LayerToggle />
      <MapTypeSelector />
      <ZoomControls />
    </MapControls>
  </MapContainer>
</GeolocationMap>
```

### **Backend Endpoints:**

#### **Get Station Coordinates**
```
GET /api/geolocation/stations
Response:
{
  "stations": [
    {
      "id": "station-001",
      "name": "Barranquilla 1",
      "latitude": 10.886806,
      "longitude": -74.774278,
      "altitude": 50,
      "status": "online",
      "devices": [...]
    }
  ]
}
```

#### **Get ALA/Bearing Data**
```
GET /api/geolocation/bearings/{measurement_id}
Response:
{
  "measurement_id": "meas-123",
  "frequency": 150000000,
  "bearings": [
    {
      "station": "station-001",
      "bearing": 45.5,
      "confidence": 0.92,
      "timestamp": "2025-10-25T12:00:00"
    }
  ],
  "calculated_position": {
    "latitude": 10.9,
    "longitude": -74.8,
    "accuracy_radius": 500
  }
}
```

#### **Get TDOA Data**
```
GET /api/geolocation/tdoa/{measurement_id}
Response:
{
  "measurement_id": "meas-124",
  "frequency": 150000000,
  "tdoa_measurements": [
    {
      "station_pair": ["station-001", "station-002"],
      "time_difference": 0.000012,
      "confidence": 0.88
    }
  ],
  "hyperbolas": [...],
  "calculated_position": {
    "latitude": 10.9,
    "longitude": -74.8,
    "ellipse": {...}
  }
}
```

---

## 🎨 Visual Design

### **Station Markers:**
```
Online Station:   🟢 (Green pin)
Offline Station:  🔴 (Red pin)
Selected Station: 🔵 (Blue pin, larger)
```

### **Bearing Lines:**
```
Single Bearing:    Solid blue line with arrow
Multiple Bearings: Different colors per station
Intersection:      Red circle at convergence point
```

### **TDOA Hyperbolas:**
```
Primary Curve:     Solid red hyperbola
Secondary Curves:  Dashed orange hyperbolas
Intersection Area: Shaded ellipse
```

---

## 📊 Data Flow

```
1. User Request:
   Frontend → "Show location of measurement X"
   
2. Backend Processing:
   ├─ Fetch measurement data
   ├─ Get station coordinates
   ├─ Calculate bearings/TDOA
   └─ Compute intersections
   
3. Frontend Rendering:
   ├─ Load base map
   ├─ Plot stations
   ├─ Draw bearing lines / hyperbolas
   ├─ Mark calculated position
   └─ Show accuracy circle/ellipse
```

---

## 🔧 Implementation Phases

### **Phase 1: Basic Map (1-2 days)**
- ✅ Install react-leaflet
- ✅ Create GeolocationMap component
- ✅ Integrate OpenStreetMap
- ✅ Display static map with pan/zoom

### **Phase 2: Station Layer (1 day)**
- ✅ Add station markers from GSS data
- ✅ Show popups with station info
- ✅ Color code by status
- ✅ Clickable markers

### **Phase 3: ALA/Bearing Layer (2 days)**
- ✅ Implement bearing line drawing
- ✅ Calculate intersections
- ✅ Show calculated positions
- ✅ Add confidence indicators

### **Phase 4: TDOA Layer (3 days)**
- ✅ Implement hyperbola math
- ✅ Draw TDOA curves
- ✅ Calculate intersections
- ✅ Show confidence ellipses

### **Phase 5: Layer Controls (1 day)**
- ✅ Add layer toggle controls
- ✅ Map type selector (OSM/Google)
- ✅ Legend
- ✅ Search/filter

### **Phase 6: Advanced Features (2 days)**
- ✅ Custom icons
- ✅ Measurement history
- ✅ Export functionality
- ✅ Distance/bearing tools

---

## 📝 Example Usage

### **View Stations:**
```jsx
<GeolocationMap
  center={[10.88, -74.77]}
  zoom={10}
  stations={stationsData}
  showStations={true}
/>
```

### **Show DF Result (ALA):**
```jsx
<GeolocationMap
  measurementId="meas-123"
  mode="ALA"
  showBearings={true}
  showIntersection={true}
/>
```

### **Show DF Result (TDOA):**
```jsx
<GeolocationMap
  measurementId="meas-124"
  mode="TDOA"
  showHyperbolas={true}
  showConfidenceEllipse={true}
/>
```

---

## 🚀 Benefits

### **For Operators:**
- ✅ Visual understanding of station network
- ✅ Quick assessment of coverage
- ✅ Immediate location results
- ✅ Compare ALA vs TDOA accuracy

### **For Analysis:**
- ✅ Historical location tracking
- ✅ Pattern recognition
- ✅ Station optimization
- ✅ Coverage gap identification

### **For Reports:**
- ✅ Export maps for documentation
- ✅ Visual evidence of locations
- ✅ Professional presentation
- ✅ Regulatory compliance

---

## 📚 Resources Needed

### **Free:**
- OpenStreetMap tiles
- Leaflet.js library
- Turf.js calculations

### **Optional (Paid):**
- Google Maps API key (~$200/month for 100k requests)
- Mapbox alternative
- Satellite imagery

---

## ✅ Ready to Implement

Once login issue is resolved, we can start with Phase 1 and have a basic working map in 1-2 days!

**Estimated Total Time:** 10-12 days for full implementation
**Priority:** High (critical for direction finding operations)

---

## 🎯 Next Steps

1. **Fix login issue** (current blocker)
2. **Install mapping libraries**
3. **Create basic map component**
4. **Integrate station data**
5. **Implement ALA visualization**
6. **Implement TDOA visualization**
7. **Add controls and polish**

Ready to proceed once you confirm login is working! 🗺️
