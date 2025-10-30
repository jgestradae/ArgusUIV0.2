import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Radio, 
  RefreshCw, 
  Server, 
  Target, 
  Activity,
  AlertCircle,
  CheckCircle,
  Antenna,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function SystemParameters() {
  const [gspData, setGspData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  useEffect(() => {
    loadSystemParameters();
    // Refresh every 30 seconds
    const interval = setInterval(loadSystemParameters, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemParameters = async () => {
    try {
      const response = await axios.get(`${API}/system/parameters`);
      if (response.data.success) {
        setGspData(response.data.data);
      } else {
        setGspData(null);
      }
    } catch (error) {
      console.error('Error loading system parameters:', error);
      setGspData(null);
    } finally {
      setLoading(false);
    }
  };

  const requestGSP = async () => {
    setRequesting(true);
    try {
      const response = await axios.post(`${API}/system/request-gsp`);
      if (response.data.success) {
        toast.success('GSP request sent to Argus');
        toast.info('Processing response... Data will update automatically');
        // Reload after a delay to allow processing
        setTimeout(loadSystemParameters, 5000);
      }
    } catch (error) {
      console.error('Error requesting GSP:', error);
      toast.error('Failed to send GSP request');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading system parameters...</span>
        </div>
      </div>
    );
  }

  if (!gspData) {
    return (
      <div className="p-8">
        <Card className="glass-card border-0">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No System Parameters Available
            </h3>
            <p className="text-slate-400 mb-6">
              Request system parameters from Argus to view signal paths and device configurations.
            </p>
            <Button 
              onClick={requestGSP}
              disabled={requesting}
              className="btn-spectrum"
            >
              {requesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 mr-2" />
                  Request GSP
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stations = gspData.stations || [];
  const signalPaths = gspData.signal_paths || [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            System Parameters (GSP)
          </h1>
          <p className="text-slate-400">
            View signal paths, devices, and system configuration from Argus
          </p>
        </div>
        <Button 
          onClick={requestGSP}
          disabled={requesting}
          className="btn-spectrum"
        >
          {requesting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Requesting...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh GSP
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Stations</p>
                <p className="text-3xl font-bold text-white">{gspData.total_stations}</p>
              </div>
              <Server className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Signal Paths</p>
                <p className="text-3xl font-bold text-white">{gspData.total_signal_paths}</p>
              </div>
              <Target className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Last Updated</p>
                <p className="text-sm font-medium text-white">
                  {new Date(gspData.timestamp).toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Status</p>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Available
                </Badge>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Monitoring Stations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station, index) => (
            <Card 
              key={index} 
              className={`glass-card border-0 cursor-pointer transition-all hover:border-blue-500/50 ${
                selectedStation?.name === station.name ? 'border-blue-500' : ''
              }`}
              onClick={() => setSelectedStation(station)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    {station.name}
                  </CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {station.type === 'F' ? 'Fixed' : 'Mobile'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Signal Paths:</span>
                  <span className="text-white font-medium">{station.signal_path_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">RMC:</span>
                  <span className="text-white font-mono text-xs">{station.rmc}</span>
                </div>
                {station.latitude !== 0 && station.longitude !== 0 && (
                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-700/30">
                    📍 {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Station Details */}
      {selectedStation && (
        <Card className="glass-card border-0 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-400" />
              Signal Paths for {selectedStation.name}
            </CardTitle>
            <CardDescription>
              {selectedStation.signal_path_count} signal paths available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedStation.signal_paths?.map((path, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium flex items-center gap-2">
                        <Antenna className="w-4 h-4 text-green-400" />
                        {path.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {path.freq_min && path.freq_max && (
                          `${(path.freq_min / 1000000).toFixed(1)} - ${(path.freq_max / 1000000).toFixed(1)} MHz`
                        )}
                      </p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                      {path.devices?.length || 0} devices
                    </Badge>
                  </div>

                  {/* Devices */}
                  {path.devices && path.devices.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-700/30">
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Settings className="w-3 h-3" />
                        Devices & Capabilities:
                      </p>
                      {path.devices.map((device, deviceIdx) => (
                        <div key={deviceIdx} className="ml-4 text-xs space-y-1">
                          <div className="text-white font-medium">
                            📡 {device.name} {device.driver && `(${device.driver})`}
                          </div>
                          {device.detectors && (
                            <div className="text-slate-400">
                              <span className="text-blue-300">Detectors:</span> {device.detectors.join(', ')}
                            </div>
                          )}
                          {device.if_bandwidth && (
                            <div className="text-slate-400">
                              <span className="text-blue-300">IF BW:</span> {device.if_bandwidth.slice(0, 5).join(', ')}
                              {device.if_bandwidth.length > 5 && '...'}
                            </div>
                          )}
                          {device.measurement_modes && (
                            <div className="text-slate-400">
                              <span className="text-blue-300">Modes:</span> {device.measurement_modes.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SystemParameters;
