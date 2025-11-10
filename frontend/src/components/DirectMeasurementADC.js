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
  Radio,
  Activity,
  Settings,
  FileText,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import LiveUDPMonitor from './LiveUDPMonitor';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function DirectMeasurementADC() {
  const [measurementType, setMeasurementType] = useState('scan');
  const [loading, setLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  
  // SCAN configuration
  const [scanConfig, setScanConfig] = useState({
    station_id: '',
    freq_start: 88000000, // 88 MHz
    freq_stop: 108000000, // 108 MHz
    freq_step: 25000,
    bandwidth: 10000,
    detector: 'RMS',
    priority: 2,
    meas_time: -1,
    attenuation: 'Auto'
  });
  
  // Single frequency configuration
  const [singleFreqConfig, setSingleFreqConfig] = useState({
    station_id: '',
    frequency: 100000000, // 100 MHz
    bandwidth: 10000,
    detector: 'RMS',
    priority: 2,
    meas_time: 1000,
    attenuation: 'Auto',
    measurement_type: 'LEVEL'
  });

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const loadRecentOrders = async () => {
    try {
      const token = localStorage.getItem('argus_token');
      const response = await fetch(`${BACKEND_URL}/api/adc/orders?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setRecentOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const handleScanOrder = async () => {
    if (!scanConfig.station_id.trim()) {
      toast.error('Please enter a station ID');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('argus_token');
      const response = await fetch(`${BACKEND_URL}/api/adc/orders/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scanConfig)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('SCAN order submitted successfully', {
          description: `Order ID: ${data.order_id}`
        });
        loadRecentOrders();
      } else {
        toast.error('Failed to submit order', {
          description: data.message || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error submitting SCAN order:', error);
      toast.error('Failed to submit order', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleFreqOrder = async () => {
    if (!singleFreqConfig.station_id.trim()) {
      toast.error('Please enter a station ID');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('argus_token');
      const response = await fetch(`${BACKEND_URL}/api/adc/orders/single-freq`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(singleFreqConfig)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Measurement order submitted successfully', {
          description: `Order ID: ${data.order_id}`
        });
        loadRecentOrders();
      } else {
        toast.error('Failed to submit order', {
          description: data.message || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error submitting measurement order:', error);
      toast.error('Failed to submit order', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Zap className="h-8 w-8 text-emerald-500" />
            Direct Measurement (ADC Mode)
          </h1>
          <p className="text-gray-400 mt-1">Create ADC orders and monitor real-time UDP data</p>
        </div>
      </div>

      <Tabs defaultValue="order" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="order" className="data-[state=active]:bg-gray-700">
            <FileText className="mr-2 h-4 w-4" />
            Create Order
          </TabsTrigger>
          <TabsTrigger value="monitor" className="data-[state=active]:bg-gray-700">
            <Activity className="mr-2 h-4 w-4" />
            Live Monitor
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gray-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            Order History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order" className="mt-4 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Measurement Type
              </CardTitle>
              <CardDescription>Select measurement type and configure parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => setMeasurementType('scan')}
                    variant={measurementType === 'scan' ? 'default' : 'outline'}
                    className={measurementType === 'scan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}
                  >
                    <Radio className="mr-2 h-4 w-4" />
                    Frequency Scan
                  </Button>
                  <Button
                    onClick={() => setMeasurementType('single')}
                    variant={measurementType === 'single' ? 'default' : 'outline'}
                    className={measurementType === 'single' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}
                  >
                    <Radio className="mr-2 h-4 w-4" />
                    Single Frequency
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {measurementType === 'scan' ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">SCAN Order Configuration</CardTitle>
                <CardDescription>Configure frequency scan parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Station ID *</Label>
                    <Input
                      value={scanConfig.station_id}
                      onChange={(e) => setScanConfig({...scanConfig, station_id: e.target.value})}
                      placeholder="e.g., Station_HQ4"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300">Priority</Label>
                    <Select value={String(scanConfig.priority)} onValueChange={(val) => setScanConfig({...scanConfig, priority: parseInt(val)})}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="2">Normal</SelectItem>
                        <SelectItem value="3">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Start Frequency (Hz)</Label>
                    <Input
                      type="number"
                      value={scanConfig.freq_start}
                      onChange={(e) => setScanConfig({...scanConfig, freq_start: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-500">{(scanConfig.freq_start / 1e6).toFixed(3)} MHz</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Stop Frequency (Hz)</Label>
                    <Input
                      type="number"
                      value={scanConfig.freq_stop}
                      onChange={(e) => setScanConfig({...scanConfig, freq_stop: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-500">{(scanConfig.freq_stop / 1e6).toFixed(3)} MHz</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Step Size (Hz)</Label>
                    <Input
                      type="number"
                      value={scanConfig.freq_step}
                      onChange={(e) => setScanConfig({...scanConfig, freq_step: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Bandwidth (Hz)</Label>
                    <Input
                      type="number"
                      value={scanConfig.bandwidth}
                      onChange={(e) => setScanConfig({...scanConfig, bandwidth: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Detector</Label>
                    <Select value={scanConfig.detector} onValueChange={(val) => setScanConfig({...scanConfig, detector: val})}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="RMS">RMS</SelectItem>
                        <SelectItem value="Peak">Peak</SelectItem>
                        <SelectItem value="AVG">Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Attenuation</Label>
                    <Input
                      value={scanConfig.attenuation}
                      onChange={(e) => setScanConfig({...scanConfig, attenuation: e.target.value})}
                      placeholder="Auto or dB value"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleScanOrder} 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? 'Submitting...' : 'Submit SCAN Order to Argus INBOX'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Single Frequency Measurement</CardTitle>
                <CardDescription>Configure single frequency measurement parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Station ID *</Label>
                    <Input
                      value={singleFreqConfig.station_id}
                      onChange={(e) => setSingleFreqConfig({...singleFreqConfig, station_id: e.target.value})}
                      placeholder="e.g., Station_HQ4"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Frequency (Hz)</Label>
                    <Input
                      type="number"
                      value={singleFreqConfig.frequency}
                      onChange={(e) => setSingleFreqConfig({...singleFreqConfig, frequency: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-500">{(singleFreqConfig.frequency / 1e6).toFixed(3)} MHz</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Measurement Type</Label>
                    <Select value={singleFreqConfig.measurement_type} onValueChange={(val) => setSingleFreqConfig({...singleFreqConfig, measurement_type: val})}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="LEVEL">Level</SelectItem>
                        <SelectItem value="DF">Direction Finding</SelectItem>
                        <SelectItem value="DEMOD">Demodulation</SelectItem>
                        <SelectItem value="SPECTRUM">Spectrum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Bandwidth (Hz)</Label>
                    <Input
                      type="number"
                      value={singleFreqConfig.bandwidth}
                      onChange={(e) => setSingleFreqConfig({...singleFreqConfig, bandwidth: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Measurement Time (ms)</Label>
                    <Input
                      type="number"
                      value={singleFreqConfig.meas_time}
                      onChange={(e) => setSingleFreqConfig({...singleFreqConfig, meas_time: parseFloat(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Detector</Label>
                    <Select value={singleFreqConfig.detector} onValueChange={(val) => setSingleFreqConfig({...singleFreqConfig, detector: val})}>
                      <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="RMS">RMS</SelectItem>
                        <SelectItem value="Peak">Peak</SelectItem>
                        <SelectItem value="AVG">Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleSingleFreqOrder} 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? 'Submitting...' : 'Submit Measurement Order to Argus INBOX'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitor" className="mt-4">
          <LiveUDPMonitor />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Order History</CardTitle>
              <CardDescription>Recent ADC orders submitted to Argus</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No orders submitted yet
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order, idx) => (
                    <div key={idx} className="p-3 border border-gray-700 rounded-lg bg-gray-900">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-white">
                            Order ID: {order.id}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Station: {order.station_id} | Created by: {order.created_by}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-emerald-600">
                          {order.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
