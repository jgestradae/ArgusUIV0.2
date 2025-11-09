import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MapPin, Radio, Navigation, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LocationMeasurementWizard({ onComplete, onCancel }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [locationType, setLocationType] = useState(''); // 'DF' or 'TDOA'
  const [stationCapabilities, setStationCapabilities] = useState([]);
  const [selectedStations, setSelectedStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [configuration, setConfiguration] = useState({
    frequency: 100000000, // 100 MHz
    measurement_time: 1000,
    bandwidth: 10000,
    detector: 'RMS',
    priority: 2
  });

  useEffect(() => {
    if (step === 2) {
      loadStationCapabilities();
    }
  }, [step]);

  const loadStationCapabilities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/location/capabilities`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStationCapabilities(response.data.capabilities);
      } else {
        toast.info(response.data.message || 'No station capabilities available');
      }
    } catch (error) {
      console.error('Error loading station capabilities:', error);
      toast.error('Failed to load station capabilities');
    } finally {
      setLoading(false);
    }
  };

  const toggleStationSelection = (stationId) => {
    setSelectedStations(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = locationType === 'DF' ? '/api/location/df-measurement' : '/api/location/tdoa-measurement';
      
      const payload = {
        station_ids: selectedStations,
        frequency: configuration.frequency,
        measurement_time: configuration.measurement_time,
        bandwidth: configuration.bandwidth,
        detector: configuration.detector,
        priority: configuration.priority
      };

      const response = await axios.post(
        `${BACKEND_URL}${endpoint}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Location measurement order created successfully', {
          description: `Measurement ID: ${response.data.measurement_id}`
        });
        onComplete(response.data);
      } else {
        toast.error('Failed to create measurement order');
      }
    } catch (error) {
      console.error('Error creating measurement:', error);
      toast.error(error.response?.data?.detail || 'Failed to create measurement');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStations = () => {
    if (!locationType) return [];
    return stationCapabilities.filter(station =>
      locationType === 'DF' ? station.supports_df : station.supports_tdoa
    );
  };

  const isValid = () => {
    if (!locationType) return false;
    if (locationType === 'DF' && selectedStations.length < 2) return false;
    if (locationType === 'TDOA' && selectedStations.length < 3) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Location Measurement Type */}
      {step === 1 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Step 1: Select Location Measurement Type
            </CardTitle>
            <CardDescription>Choose between Direction Finding (DF) or TDOA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setLocationType('DF')}
                variant={locationType === 'DF' ? 'default' : 'outline'}
                className={`h-32 flex flex-col items-center justify-center gap-3 ${
                  locationType === 'DF' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600 hover:bg-gray-700'
                }`}
              >
                <Navigation className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-bold">Direction Finding (DF)</div>
                  <div className="text-xs opacity-70">Bearing measurements from multiple stations</div>
                </div>
              </Button>

              <Button
                onClick={() => setLocationType('TDOA')}
                variant={locationType === 'TDOA' ? 'default' : 'outline'}
                className={`h-32 flex flex-col items-center justify-center gap-3 ${
                  locationType === 'TDOA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600 hover:bg-gray-700'
                }`}
              >
                <Target className="h-12 w-12" />
                <div className="text-center">
                  <div className="font-bold">TDOA</div>
                  <div className="text-xs opacity-70">Time Difference of Arrival positioning</div>
                </div>
              </Button>
            </div>

            <div className="mt-6 flex justify-between">
              <Button onClick={onCancel} variant="outline" className="border-gray-600">
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!locationType}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next: Select Stations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Stations */}
      {step === 2 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Step 2: Select {locationType}-Capable Stations
            </CardTitle>
            <CardDescription>
              {locationType === 'DF' ? 'Select at least 2 stations' : 'Select at least 3 stations'} for {locationType} measurement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading station capabilities...</div>
            ) : getFilteredStations().length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <p className="text-gray-400">No {locationType}-capable stations available</p>
                <p className="text-sm text-gray-500 mt-2">Please run GSP request first to retrieve station capabilities</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {getFilteredStations().map((station) => (
                    <div
                      key={station.station_id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedStations.includes(station.station_id)
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => toggleStationSelection(station.station_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedStations.includes(station.station_id)}
                            onCheckedChange={() => toggleStationSelection(station.station_id)}
                          />
                          <div>
                            <div className="font-medium text-white">{station.station_name}</div>
                            <div className="text-sm text-gray-400">{station.station_id}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {station.supports_df && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                              DF
                            </Badge>
                          )}
                          {station.supports_tdoa && (
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                              TDOA
                            </Badge>
                          )}
                        </div>
                      </div>
                      {station.latitude && station.longitude && (
                        <div className="text-xs text-gray-500 mt-2">
                          Coordinates: {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="mt-4 p-3 bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Selected Stations:</span>
                <Badge variant="default" className="bg-emerald-600">
                  {selectedStations.length}
                </Badge>
              </div>
              {locationType === 'DF' && selectedStations.length < 2 && (
                <p className="text-xs text-yellow-400 mt-2">⚠️ Minimum 2 stations required for DF</p>
              )}
              {locationType === 'TDOA' && selectedStations.length < 3 && (
                <p className="text-xs text-yellow-400 mt-2">⚠️ Minimum 3 stations required for TDOA</p>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <Button onClick={() => setStep(1)} variant="outline" className="border-gray-600">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!isValid()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Next: Configure Measurement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configure Measurement */}
      {step === 3 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Step 3: Configure Measurement Parameters
            </CardTitle>
            <CardDescription>Set frequency and measurement parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Frequency (Hz)</Label>
                  <Input
                    type="number"
                    value={configuration.frequency}
                    onChange={(e) => setConfiguration({ ...configuration, frequency: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">{(configuration.frequency / 1e6).toFixed(3)} MHz</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Measurement Time (ms)</Label>
                  <Input
                    type="number"
                    value={configuration.measurement_time}
                    onChange={(e) => setConfiguration({ ...configuration, measurement_time: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Bandwidth (Hz)</Label>
                  <Input
                    type="number"
                    value={configuration.bandwidth}
                    onChange={(e) => setConfiguration({ ...configuration, bandwidth: parseFloat(e.target.value) })}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Detector</Label>
                  <select
                    value={configuration.detector}
                    onChange={(e) => setConfiguration({ ...configuration, detector: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  >
                    <option value="RMS">RMS</option>
                    <option value="Peak">Peak</option>
                    <option value="AVG">Average</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg">
                <h4 className="font-medium text-white mb-2">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Measurement Type:</span>
                    <span className="text-white font-medium">{locationType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stations:</span>
                    <span className="text-white">{selectedStations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Frequency:</span>
                    <span className="text-white">{(configuration.frequency / 1e6).toFixed(3)} MHz</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button onClick={() => setStep(2)} variant="outline" className="border-gray-600">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Creating...' : 'Create Location Measurement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
