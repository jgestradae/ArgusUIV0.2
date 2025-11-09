import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { MapPin, RefreshCw, Eye } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LocationResultsViewer from './LocationResultsViewer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LocationMeasurementResults() {
  const { t } = useTranslation();
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [viewingResults, setViewingResults] = useState(false);

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/location/measurements?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMeasurements(response.data.measurements);
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const viewResults = async (measurementId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/location/results/${measurementId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Mock data structure for demonstration
        // In production, this would come from parsed XML results
        const mockData = {
          measurement_type: response.data.results.measurement_type,
          df_bearings: response.data.results.measurement_type === 'DF' ? [
            {
              station_name: 'Station HQ4',
              bearing: 45.5,
              signal_level: -65.3,
              confidence: 85,
              latitude: 4.6097,
              longitude: -74.0817,
              timestamp: new Date().toISOString()
            },
            {
              station_name: 'Station Test',
              bearing: 135.2,
              signal_level: -68.1,
              confidence: 78,
              latitude: 4.7000,
              longitude: -74.1000,
              timestamp: new Date().toISOString()
            }
          ] : [],
          tdoa_measurements: response.data.results.measurement_type === 'TDOA' ? [
            {
              station_pair: ['Station A', 'Station B'],
              time_difference: 12.5,
              distance_difference: 3750,
              confidence: 82
            }
          ] : [],
          calculated_position: {
            lat: 4.6500,
            lon: -74.0900,
            accuracy: 150
          }
        };

        setSelectedMeasurement(mockData);
        setViewingResults(true);
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load measurement results');
    }
  };

  if (viewingResults && selectedMeasurement) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-8 w-8 text-emerald-500" />
            {t('location.results')}
          </h1>
          <Button
            onClick={() => {
              setViewingResults(false);
              setSelectedMeasurement(null);
            }}
            variant="outline"
            className="border-gray-600"
          >
            {t('common.back')}
          </Button>
        </div>

        <LocationResultsViewer measurementData={selectedMeasurement} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-8 w-8 text-emerald-500" />
            {t('location.title')}
          </h1>
          <p className="text-gray-400 mt-1">View DF/TDOA measurement results</p>
        </div>
        <Button
          onClick={loadMeasurements}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Location Measurements</CardTitle>
          <CardDescription>List of all location measurements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
          ) : measurements.length === 0 ? (
            <div className="text-center py-8 text-gray-400">{t('common.no_data')}</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {measurements.map((measurement, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-gray-700 rounded-lg bg-gray-900 hover:bg-gray-850 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="default"
                            className={
                              measurement.measurement_type === 'DF'
                                ? 'bg-blue-600'
                                : 'bg-purple-600'
                            }
                          >
                            {measurement.measurement_type}
                          </Badge>
                          <span className="text-white font-medium">
                            ID: {measurement.measurement_id}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">{t('location.frequency')}:</span>
                            <span className="text-white ml-2">
                              {(measurement.frequency / 1e6).toFixed(3)} MHz
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('location.station')}s:</span>
                            <span className="text-white ml-2">{measurement.station_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created by:</span>
                            <span className="text-white ml-2">{measurement.created_by}</span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(measurement.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        onClick={() => viewResults(measurement.measurement_id)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('location.results')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
