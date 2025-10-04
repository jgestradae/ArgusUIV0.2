import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Zap, 
  Play,
  Square,
  Settings,
  Radio,
  BarChart3,
  Clock,
  Frequency,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DirectMeasurement() {
  const [measurementConfig, setMeasurementConfig] = useState({
    measurement_name: '',
    suborder_task: 'FFM',
    result_type: 'MR',
    custom_config: {
      freq_mode: 'S',
      freq_single: 100000000, // 100 MHz
      if_bandwidth: 9000,
      rf_attenuation: 'Auto',
      demodulation: 'FM',
      measurement_time: 5,
      meas_data_type: 'LV',
      detect_type: 'Average'
    }
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [recentMeasurements, setRecentMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentMeasurements();
  }, []);

  const loadRecentMeasurements = async () => {
    try {
      const response = await axios.get(`${API}/measurements/orders`);
      setRecentMeasurements(response.data.slice(0, 10)); // Latest 10
    } catch (error) {
      console.error('Error loading measurements:', error);
    }
  };

  const handleConfigChange = (field, value) => {
    setMeasurementConfig(prev => ({
      ...prev,
      custom_config: {
        ...prev.custom_config,
        [field]: value
      }
    }));
  };

  const handleStartMeasurement = async () => {
    if (!measurementConfig.measurement_name.trim()) {
      toast.error('Please enter a measurement name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/measurements/direct`, measurementConfig);
      
      if (response.data.success) {
        setCurrentOrder(response.data.data.order);
        setIsRunning(true);
        toast.success('Measurement started successfully', {
          description: `Order ID: ${response.data.data.order_id}`
        });
        loadRecentMeasurements();
      }
    } catch (error) {
      console.error('Error starting measurement:', error);
      toast.error('Failed to start measurement', {
        description: error.response?.data?.detail || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStopMeasurement = () => {
    setIsRunning(false);
    setCurrentOrder(null);
    toast.info('Measurement stopped');
  };

  const getOrderStateColor = (state) => {
    switch (state) {
      case 'Finished':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'In Process':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Open':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const taskOptions = [
    { value: 'FFM', label: 'Fixed Frequency Mode', description: 'Single frequency measurement' },
    { value: 'SCAN', label: 'Frequency Scan', description: 'Scan across frequency range' },
    { value: 'DSCAN', label: 'D-Scan', description: 'Direction finding scan' },
    { value: 'PSCAN', label: 'P-Scan', description: 'Panoramic scan' },
    { value: 'FLSCAN', label: 'Frequency List Scan', description: 'Scan predefined frequencies' },
  ];

  const demodOptions = [
    { value: 'OFF', label: 'Off' },
    { value: 'FM', label: 'FM' },
    { value: 'AM', label: 'AM' },
    { value: 'USB', label: 'USB' },
    { value: 'LSB', label: 'LSB' },
    { value: 'CW', label: 'CW' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Direct Measurement</h1>
          <p className="text-slate-400">Configure and execute real-time spectrum measurements</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`status-indicator ${isRunning ? 'online' : 'offline'}`}></div>
          <span className="text-sm text-slate-400">
            {isRunning ? 'Measurement Active' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Measurement Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Measurement Configuration
              </CardTitle>
              <CardDescription>Configure your spectrum measurement parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Measurement Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter measurement name"
                    value={measurementConfig.measurement_name}
                    onChange={(e) => setMeasurementConfig(prev => ({...prev, measurement_name: e.target.value}))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="task">Measurement Task</Label>
                  <Select 
                    value={measurementConfig.suborder_task} 
                    onValueChange={(value) => setMeasurementConfig(prev => ({...prev, suborder_task: value}))}
                  >
                    <SelectTrigger className="input-spectrum">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskOptions.map(option => (
                        <SelectItem key={option.value} value={option.value || "default"}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-slate-400">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Frequency Configuration */}
              <Tabs defaultValue="single" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="single" onClick={() => handleConfigChange('freq_mode', 'S')}>Single Frequency</TabsTrigger>
                  <TabsTrigger value="range" onClick={() => handleConfigChange('freq_mode', 'R')}>Frequency Range</TabsTrigger>
                  <TabsTrigger value="list" onClick={() => handleConfigChange('freq_mode', 'L')}>Frequency List</TabsTrigger>
                </TabsList>
                
                <TabsContent value="single" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="freq_single">Frequency (Hz)</Label>
                    <Input
                      id="freq_single"
                      type="number"
                      placeholder="100000000"
                      value={measurementConfig.custom_config.freq_single}
                      onChange={(e) => handleConfigChange('freq_single', parseInt(e.target.value))}
                      className="input-spectrum"
                    />
                    <p className="text-xs text-slate-400">Example: 100000000 = 100 MHz</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="range" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freq_low">Start Frequency (Hz)</Label>
                      <Input
                        id="freq_low"
                        type="number"
                        placeholder="80000000"
                        onChange={(e) => handleConfigChange('freq_range_low', parseInt(e.target.value))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freq_high">Stop Frequency (Hz)</Label>
                      <Input
                        id="freq_high"
                        type="number"
                        placeholder="120000000"
                        onChange={(e) => handleConfigChange('freq_range_high', parseInt(e.target.value))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freq_step">Step Size (Hz)</Label>
                      <Input
                        id="freq_step"
                        type="number"
                        placeholder="1000000"
                        onChange={(e) => handleConfigChange('freq_step', parseInt(e.target.value))}
                        className="input-spectrum"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="list" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="freq_list">Frequency List (Hz, comma-separated)</Label>
                    <Input
                      id="freq_list"
                      placeholder="100000000, 200000000, 300000000"
                      onChange={(e) => {
                        const freqs = e.target.value.split(',').map(f => parseInt(f.trim())).filter(f => !isNaN(f));
                        handleConfigChange('freq_list', freqs);
                      }}
                      className="input-spectrum"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Advanced Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="if_bw">IF Bandwidth (Hz)</Label>
                  <Input
                    id="if_bw"
                    type="number"
                    value={measurementConfig.custom_config.if_bandwidth}
                    onChange={(e) => handleConfigChange('if_bandwidth', parseInt(e.target.value))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rf_att">RF Attenuation</Label>
                  <Select 
                    value={measurementConfig.custom_config.rf_attenuation} 
                    onValueChange={(value) => handleConfigChange('rf_attenuation', value)}
                  >
                    <SelectTrigger className="input-spectrum">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto</SelectItem>
                      <SelectItem value="0">0 dB</SelectItem>
                      <SelectItem value="10">10 dB</SelectItem>
                      <SelectItem value="20">20 dB</SelectItem>
                      <SelectItem value="30">30 dB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="demod">Demodulation</Label>
                  <Select 
                    value={measurementConfig.custom_config.demodulation} 
                    onValueChange={(value) => handleConfigChange('demodulation', value)}
                  >
                    <SelectTrigger className="input-spectrum">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {demodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="meas_time">Measurement Time (s)</Label>
                  <Input
                    id="meas_time"
                    type="number"
                    value={measurementConfig.custom_config.measurement_time}
                    onChange={(e) => handleConfigChange('measurement_time', parseInt(e.target.value))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_type">Data Type</Label>
                  <Select 
                    value={measurementConfig.custom_config.meas_data_type} 
                    onValueChange={(value) => handleConfigChange('meas_data_type', value)}
                  >
                    <SelectTrigger className="input-spectrum">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LV">Level</SelectItem>
                      <SelectItem value="FM">Frequency</SelectItem>
                      <SelectItem value="BE">Bearing</SelectItem>
                      <SelectItem value="BW">Bandwidth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="detect_type">Detection</Label>
                  <Select 
                    value={measurementConfig.custom_config.detect_type} 
                    onValueChange={(value) => handleConfigChange('detect_type', value)}
                  >
                    <SelectTrigger className="input-spectrum">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Average">Average</SelectItem>
                      <SelectItem value="Peak">Peak</SelectItem>
                      <SelectItem value="RMS">RMS</SelectItem>
                      <SelectItem value="QuasiPeak">Quasi Peak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex space-x-4 pt-4 border-t border-slate-700/50">
                <Button 
                  onClick={handleStartMeasurement}
                  disabled={isRunning || loading}
                  className="btn-spectrum flex-1"
                >
                  {loading ? (
                    <div className="spinner mr-2"></div>
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Start Measurement
                </Button>
                
                <Button 
                  onClick={handleStopMeasurement}
                  disabled={!isRunning}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Measurement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status and Results Panel */}
        <div className="space-y-6">
          {/* Current Measurement Status */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRunning && currentOrder ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="status-indicator online"></div>
                    <span className="text-sm font-medium text-green-300">Measurement Active</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Order ID:</span>
                      <span className="text-white font-mono">{currentOrder.order_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Task:</span>
                      <span className="text-white">{currentOrder.suborder_task}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Started:</span>
                      <span className="text-white">{new Date(currentOrder.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 w-full justify-center">
                    In Progress
                  </Badge>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="status-indicator offline"></div>
                    <span className="text-sm font-medium text-slate-400">Ready to Measure</span>
                  </div>
                  <p className="text-slate-500 text-sm">Configure parameters and start measurement</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Measurements */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Recent Measurements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentMeasurements.length > 0 ? recentMeasurements.map((measurement) => (
                  <div key={measurement.id} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white text-sm truncate">{measurement.order_name}</span>
                      <Badge className={getOrderStateColor(measurement.order_state)}>
                        {measurement.order_state === 'Finished' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {measurement.order_state}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Task:</span>
                        <span>{measurement.suborder_task}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{new Date(measurement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-400 text-center py-4 text-sm">No recent measurements</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
