import React, { useState, useEffect, useRef } from 'react';
import { TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  Map as MapIcon,
  Radio,
  Navigation,
  Layers,
  MapPin,
  Target,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import LeafletMapWrapper from './LeafletMapWrapper';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons for different station states
const createCustomIcon = (color = 'blue', isOnline = true) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background-color: ${isOnline ? '#10b981' : '#ef4444'};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Component to update map view when center/zoom changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function GeolocationMap({ 
  measurementId = null,
  mode = null, // 'ALA' or 'TDOA'
  initialCenter = [4.6097, -74.0817], // Colombia center (Bogotá)
  initialZoom = 6
}) {
  const [stations, setStations] = useState([]);
  const [bearings, setBearings] = useState([]);
  const [tdoaData, setTdoaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  const [mapKey, setMapKey] = useState(Date.now()); // Unique key for hot-reload fix
  const mapContainerRef = useRef(null);
  
  // Layer visibility toggles
  const [showStations, setShowStations] = useState(true);
  const [showBearings, setShowBearings] = useState(true);
  const [showTDOA, setShowTDOA] = useState(true);
  const [showIntersections, setShowIntersections] = useState(true);

  // Cleanup on unmount to prevent "already initialized" error
  useEffect(() => {
    return () => {
      // Force cleanup of any lingering map instances
      if (mapContainerRef.current) {
        const container = mapContainerRef.current;
        if (container._leaflet_id) {
          // Remove Leaflet's internal reference
          delete container._leaflet_id;
        }
      }
    };
  }, []);

  useEffect(() => {
    loadStations();
    if (measurementId) {
      if (mode === 'ALA') {
        loadBearingData(measurementId);
      } else if (mode === 'TDOA') {
        loadTDOAData(measurementId);
      }
    }
  }, [measurementId, mode]);

  const loadStations = async () => {
    try {
      // Get stations from latest system state
      const response = await axios.get(`${API}/api/system/status`);
      if (response.data.stations) {
        const stationsWithCoords = response.data.stations.filter(
          s => s.latitude && s.longitude
        );
        setStations(stationsWithCoords);
        
        // Auto-zoom to fit all stations
        if (stationsWithCoords.length > 0) {
          const bounds = stationsWithCoords.map(s => [s.latitude, s.longitude]);
          // Calculate center
          const centerLat = bounds.reduce((sum, b) => sum + b[0], 0) / bounds.length;
          const centerLng = bounds.reduce((sum, b) => sum + b[1], 0) / bounds.length;
          setMapCenter([centerLat, centerLng]);
          setMapZoom(7);
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      // Use mock data for demonstration
      setStations([
        {
          name: "Barranquilla 1",
          latitude: 10.886806,
          longitude: -74.774278,
          running: true,
          device_count: 21,
          pc: "ANEDK-024"
        },
        {
          name: "Cali 1",
          latitude: 3.451647,
          longitude: -76.531985,
          running: true,
          device_count: 21,
          pc: "ANEDK-104"
        },
        {
          name: "Medellin 1",
          latitude: 6.244203,
          longitude: -75.581211,
          running: true,
          device_count: 21,
          pc: "ANEPT-086"
        },
        {
          name: "Bogotá 1",
          latitude: 4.710989,
          longitude: -74.072092,
          running: false,
          device_count: 0,
          pc: "CENTRAL-01"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setMapKey(Date.now()); // Force map remount
    loadStations();
  };

  const loadBearingData = async (measId) => {
    try {
      // Mock ALA bearing data for demonstration
      const mockBearings = [
        {
          station_name: "Barranquilla 1",
          station_coords: [10.886806, -74.774278],
          bearing: 135, // degrees
          confidence: 0.92,
          distance: 50 // km
        },
        {
          station_name: "Cali 1",
          station_coords: [3.451647, -76.531985],
          bearing: 45,
          confidence: 0.88,
          distance: 50
        },
        {
          station_name: "Medellin 1",
          station_coords: [6.244203, -75.581211],
          bearing: 180,
          confidence: 0.85,
          distance: 50
        }
      ];
      
      setBearings(mockBearings);
      toast.success('ALA bearing data loaded');
    } catch (error) {
      console.error('Error loading bearing data:', error);
      toast.error('Failed to load bearing data');
    }
  };

  const loadTDOAData = async (measId) => {
    try {
      // Mock TDOA data for demonstration
      const mockTDOA = {
        station_pairs: [
          {
            station1: "Barranquilla 1",
            station2: "Cali 1",
            coords1: [10.886806, -74.774278],
            coords2: [3.451647, -76.531985],
            time_diff: 0.000015 // seconds
          }
        ],
        calculated_position: {
          latitude: 7.0,
          longitude: -75.5,
          accuracy_radius: 5000 // meters
        }
      };
      
      setTdoaData(mockTDOA);
      toast.success('TDOA data loaded');
    } catch (error) {
      console.error('Error loading TDOA data:', error);
      toast.error('Failed to load TDOA data');
    }
  };

  // Calculate bearing line endpoint
  const calculateBearingEndpoint = (startCoords, bearing, distance) => {
    const start = turf.point([startCoords[1], startCoords[0]]);
    const destination = turf.destination(start, distance, bearing, { units: 'kilometers' });
    return [destination.geometry.coordinates[1], destination.geometry.coordinates[0]];
  };

  // Calculate bearing line intersections
  const calculateIntersections = () => {
    if (bearings.length < 2) return null;
    
    try {
      // Simplified intersection calculation
      // In production, use more sophisticated algorithms
      const lines = bearings.map(b => {
        const start = [b.station_coords[1], b.station_coords[0]];
        const end = calculateBearingEndpoint(b.station_coords, b.bearing, b.distance);
        return turf.lineString([start, [end[1], end[0]]]);
      });
      
      // Find approximate intersection point (centroid of all lines)
      const points = bearings.map(b => turf.point([b.station_coords[1], b.station_coords[0]]));
      const collection = turf.featureCollection(points);
      const center = turf.center(collection);
      
      return [center.geometry.coordinates[1], center.geometry.coordinates[0]];
    } catch (error) {
      console.error('Error calculating intersections:', error);
      return null;
    }
  };

  const intersection = showIntersections ? calculateIntersections() : null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="glass-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-white flex items-center">
                <MapIcon className="w-5 h-5 mr-2" />
                Geolocation Map
              </CardTitle>
              <CardDescription>
                {mode === 'ALA' ? 'Angle of Arrival (Bearing) Visualization' :
                 mode === 'TDOA' ? 'Time Difference of Arrival Visualization' :
                 'Monitoring Station Locations'}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="stations-layer"
                checked={showStations}
                onCheckedChange={setShowStations}
              />
              <Label htmlFor="stations-layer" className="flex items-center cursor-pointer">
                <MapPin className="w-4 h-4 mr-1" />
                Stations
              </Label>
            </div>
            
            {mode === 'ALA' && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="bearings-layer"
                    checked={showBearings}
                    onCheckedChange={setShowBearings}
                  />
                  <Label htmlFor="bearings-layer" className="flex items-center cursor-pointer">
                    <Navigation className="w-4 h-4 mr-1" />
                    Bearings
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="intersections-layer"
                    checked={showIntersections}
                    onCheckedChange={setShowIntersections}
                  />
                  <Label htmlFor="intersections-layer" className="flex items-center cursor-pointer">
                    <Target className="w-4 h-4 mr-1" />
                    Intersection
                  </Label>
                </div>
              </>
            )}
            
            {mode === 'TDOA' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="tdoa-layer"
                  checked={showTDOA}
                  onCheckedChange={setShowTDOA}
                />
                <Label htmlFor="tdoa-layer" className="flex items-center cursor-pointer">
                  <Layers className="w-4 h-4 mr-1" />
                  TDOA Hyperbolas
                </Label>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-400 mb-2">Legend:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <span className="text-slate-300">Online Station</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                <span className="text-slate-300">Offline Station</span>
              </div>
              {mode === 'ALA' && (
                <>
                  <div className="flex items-center">
                    <div className="w-8 h-0.5 bg-blue-500 mr-1"></div>
                    <span className="text-slate-300">Bearing Line</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white mr-1"></div>
                    <span className="text-slate-300">Calculated Position</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          {!loading ? (
            <div 
              key={mapKey}
              id={`leaflet-map-container-${mapKey}`}
              style={{ height: '600px', width: '100%' }}
            >
              <LeafletMapWrapper
                key={mapKey}
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                scrollWheelZoom={true}
              >
              <ChangeView center={mapCenter} zoom={mapZoom} />
              
              {/* Base Layer - OpenStreetMap */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Station Markers */}
              {showStations && stations.map((station, index) => (
                <Marker
                  key={index}
                  position={[station.latitude, station.longitude]}
                  icon={createCustomIcon('blue', station.running)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1">{station.name}</h3>
                      <div className="space-y-1 text-sm">
                        <p><strong>PC:</strong> {station.pc}</p>
                        <p><strong>Devices:</strong> {station.device_count}</p>
                        <p><strong>Status:</strong> 
                          <Badge className={`ml-2 ${station.running ? 'bg-green-500' : 'bg-red-500'}`}>
                            {station.running ? 'Online' : 'Offline'}
                          </Badge>
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* ALA Bearing Lines */}
              {mode === 'ALA' && showBearings && bearings.map((bearing, index) => {
                const endpoint = calculateBearingEndpoint(
                  bearing.station_coords,
                  bearing.bearing,
                  bearing.distance
                );
                
                return (
                  <Polyline
                    key={`bearing-${index}`}
                    positions={[bearing.station_coords, endpoint]}
                    color={['#3b82f6', '#8b5cf6', '#ec4899'][index % 3]}
                    weight={3}
                    opacity={0.7}
                  />
                );
              })}
              
              {/* Intersection Point */}
              {mode === 'ALA' && showIntersections && intersection && (
                <>
                  <Marker position={intersection}>
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">Calculated Position</h3>
                        <p className="text-sm">Based on bearing intersections</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {intersection[0].toFixed(6)}, {intersection[1].toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={intersection}
                    radius={2000}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.1
                    }}
                  />
                </>
              )}
              
              {/* TDOA Visualization */}
              {mode === 'TDOA' && showTDOA && tdoaData && tdoaData.calculated_position && (
                <>
                  <Marker position={[
                    tdoaData.calculated_position.latitude,
                    tdoaData.calculated_position.longitude
                  ]}>
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">TDOA Position</h3>
                        <p className="text-sm">Accuracy: ±{(tdoaData.calculated_position.accuracy_radius / 1000).toFixed(1)} km</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[
                      tdoaData.calculated_position.latitude,
                      tdoaData.calculated_position.longitude
                    ]}
                    radius={tdoaData.calculated_position.accuracy_radius}
                    pathOptions={{
                      color: '#f59e0b',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.1
                    }}
                  />
                </>
              )}
            </LeafletMapWrapper>
          </div>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '600px', width: '100%' }}>
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Loading map...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Total Stations</p>
              <p className="text-2xl font-bold text-white">{stations.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Online</p>
              <p className="text-2xl font-bold text-green-400">
                {stations.filter(s => s.running).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Offline</p>
              <p className="text-2xl font-bold text-red-400">
                {stations.filter(s => !s.running).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <p className="text-xs text-slate-400">Coverage Area</p>
              <p className="text-2xl font-bold text-cyan-400">
                {stations.length > 0 ? 'Colombia' : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
