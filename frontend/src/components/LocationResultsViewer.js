import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { FileSpreadsheet, Compass, Map as MapIcon } from 'lucide-react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function LocationResultsViewer({ measurementData }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('spreadsheet');

  if (!measurementData) {
    return (
      <div className="text-center text-gray-400 py-8">
        {t('common.no_data')}
      </div>
    );
  }

  const { measurement_type, df_bearings = [], tdoa_measurements = [], calculated_position } = measurementData;

  // Spreadsheet View Component
  const SpreadsheetView = () => (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{t('location.spreadsheet_view')}</CardTitle>
        <CardDescription>
          {measurement_type === 'DF' ? t('location.df') : t('location.tdoa')} {t('location.results')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {measurement_type === 'DF' && df_bearings.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">{t('location.station')}</TableHead>
                  <TableHead className="text-gray-300">{t('location.bearing')}</TableHead>
                  <TableHead className="text-gray-300">{t('location.signal_level')}</TableHead>
                  <TableHead className="text-gray-300">{t('location.confidence')}</TableHead>
                  <TableHead className="text-gray-300">{t('common.time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {df_bearings.map((bearing, idx) => (
                  <TableRow key={idx} className="border-gray-700">
                    <TableCell className="text-white">{bearing.station_name}</TableCell>
                    <TableCell className="text-white">{bearing.bearing.toFixed(1)}°</TableCell>
                    <TableCell className="text-white">
                      {bearing.signal_level ? `${bearing.signal_level.toFixed(1)} dBμV` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-white">
                      {bearing.confidence ? `${bearing.confidence.toFixed(0)}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(bearing.timestamp).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {measurement_type === 'TDOA' && tdoa_measurements.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">{t('location.station')} Pair</TableHead>
                  <TableHead className="text-gray-300">{t('location.time_difference')}</TableHead>
                  <TableHead className="text-gray-300">Distance Diff (m)</TableHead>
                  <TableHead className="text-gray-300">{t('location.confidence')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tdoa_measurements.map((tdoa, idx) => (
                  <TableRow key={idx} className="border-gray-700">
                    <TableCell className="text-white">
                      {tdoa.station_pair.join(' - ')}
                    </TableCell>
                    <TableCell className="text-white">
                      {tdoa.time_difference.toFixed(3)} μs
                    </TableCell>
                    <TableCell className="text-white">
                      {tdoa.distance_difference.toFixed(1)} m
                    </TableCell>
                    <TableCell className="text-white">
                      {tdoa.confidence ? `${tdoa.confidence.toFixed(0)}%` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {calculated_position && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <h4 className="text-emerald-300 font-medium mb-2">{t('location.calculated_position')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Latitude:</span>
                  <span className="text-white ml-2">{calculated_position.lat.toFixed(6)}°</span>
                </div>
                <div>
                  <span className="text-gray-400">Longitude:</span>
                  <span className="text-white ml-2">{calculated_position.lon.toFixed(6)}°</span>
                </div>
                <div>
                  <span className="text-gray-400">{t('location.accuracy')}:</span>
                  <span className="text-white ml-2">{calculated_position.accuracy} m</span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // Polar View Component (DF Histogram)
  const PolarView = () => {
    if (measurement_type !== 'DF' || df_bearings.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          {t('location.polar_view')} only available for DF measurements
        </div>
      );
    }

    // Prepare data for polar chart
    const bearingData = Array(360).fill(0);
    df_bearings.forEach(bearing => {
      const angle = Math.round(bearing.bearing) % 360;
      bearingData[angle] += bearing.signal_level || 1;
    });

    const chartData = {
      labels: Array.from({ length: 36 }, (_, i) => `${i * 10}°`),
      datasets: [{
        label: t('location.bearing') + ' Histogram',
        data: Array.from({ length: 36 }, (_, i) => {
          const start = i * 10;
          const end = start + 10;
          return bearingData.slice(start, end).reduce((a, b) => a + b, 0) / 10;
        }),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          ticks: { color: '#9ca3af' },
          grid: { color: '#374151' },
          pointLabels: { color: '#9ca3af', font: { size: 12 } }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#9ca3af' }
        }
      }
    };

    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">{t('location.polar_view')}</CardTitle>
          <CardDescription>DF Bearing Distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '500px' }}>
            <PolarArea data={chartData} options={options} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {df_bearings.map((bearing, idx) => (
              <div key={idx} className="p-3 bg-gray-900 rounded-lg">
                <div className="text-gray-400 text-xs">{bearing.station_name}</div>
                <div className="text-white font-medium">{bearing.bearing.toFixed(1)}°</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Map View Component
  const MapView = () => {
    // Calculate center position
    const stations = measurement_type === 'DF' ? df_bearings : [];
    const centerLat = stations.length > 0 
      ? stations.reduce((sum, s) => sum + (s.latitude || 0), 0) / stations.length 
      : 4.6097;
    const centerLng = stations.length > 0 
      ? stations.reduce((sum, s) => sum + (s.longitude || 0), 0) / stations.length 
      : -74.0817;

    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">{t('location.map_view')}</CardTitle>
          <CardDescription>
            {measurement_type === 'DF' ? 'DF Bearings' : 'TDOA Hyperbolas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* DF Bearings */}
              {measurement_type === 'DF' && df_bearings.map((bearing, idx) => {
                if (!bearing.latitude || !bearing.longitude) return null;

                const stationPos = [bearing.latitude, bearing.longitude];
                
                // Calculate bearing line endpoint (50km)
                const bearingRad = (bearing.bearing * Math.PI) / 180;
                const distance = 50000; // 50km in meters
                const R = 6371000; // Earth radius in meters
                
                const lat1 = (bearing.latitude * Math.PI) / 180;
                const lon1 = (bearing.longitude * Math.PI) / 180;
                
                const lat2 = Math.asin(
                  Math.sin(lat1) * Math.cos(distance / R) +
                  Math.cos(lat1) * Math.sin(distance / R) * Math.cos(bearingRad)
                );
                
                const lon2 = lon1 + Math.atan2(
                  Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(lat1),
                  Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
                );
                
                const endPos = [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];

                return (
                  <React.Fragment key={idx}>
                    <Marker position={stationPos}>
                      <Popup>
                        <div>
                          <strong>{bearing.station_name}</strong><br />
                          Bearing: {bearing.bearing.toFixed(1)}°<br />
                          Level: {bearing.signal_level?.toFixed(1)} dBμV
                        </div>
                      </Popup>
                    </Marker>
                    <Polyline
                      positions={[stationPos, endPos]}
                      color="#10b981"
                      weight={2}
                      opacity={0.7}
                    />
                  </React.Fragment>
                );
              })}

              {/* Calculated Position */}
              {calculated_position && (
                <>
                  <Marker
                    position={[calculated_position.lat, calculated_position.lon]}
                    icon={L.icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41]
                    })}
                  >
                    <Popup>
                      <div>
                        <strong>{t('location.calculated_position')}</strong><br />
                        Lat: {calculated_position.lat.toFixed(6)}°<br />
                        Lon: {calculated_position.lon.toFixed(6)}°<br />
                        Accuracy: {calculated_position.accuracy} m
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[calculated_position.lat, calculated_position.lon]}
                    radius={calculated_position.accuracy}
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="spreadsheet" className="data-[state=active]:bg-gray-700">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('location.spreadsheet_view')}
          </TabsTrigger>
          <TabsTrigger value="polar" className="data-[state=active]:bg-gray-700">
            <Compass className="mr-2 h-4 w-4" />
            {t('location.polar_view')}
          </TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-gray-700">
            <MapIcon className="mr-2 h-4 w-4" />
            {t('location.map_view')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spreadsheet" className="mt-4">
          <SpreadsheetView />
        </TabsContent>

        <TabsContent value="polar" className="mt-4">
          <PolarView />
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <MapView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
