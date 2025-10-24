import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Activity, 
  Radio, 
  RefreshCw,
  Server,
  Monitor,
  Clock,
  User,
  MapPin,
  Wifi,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SystemStatus() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    loadSystemStatus();
    // Auto-refresh every 60 seconds (GSS queries are heavy on Argus)
    const interval = setInterval(loadSystemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemStatus = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API}/system/status`);
      setSystemStatus(response.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading system status:', error);
      toast.error('Failed to load system status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshSystemStatus = async () => {
    setRefreshing(true);
    await loadSystemStatus();
  };

  const getStatusColor = (isRunning) => {
    return isRunning ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = (isRunning) => {
    return isRunning ? (
      <CheckCircle className="w-5 h-5 text-green-400" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-400" />
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700/50 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-700/30 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Status</h1>
          <p className="text-slate-400">Real-time monitoring of Argus spectrum system</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastRefresh && (
            <div className="text-sm text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          <Button 
            onClick={refreshSystemStatus} 
            disabled={refreshing}
            className="btn-spectrum"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Argus System</p>
                <p className={`text-xl font-bold ${getStatusColor(systemStatus?.argus_running)}`}>
                  {systemStatus?.argus_running ? 'Running' : 'Stopped'}
                </p>
              </div>
              {getStatusIcon(systemStatus?.argus_running)}
            </div>
            <div className="flex items-center mt-3">
              <div className={`status-indicator ${systemStatus?.argus_running ? 'online' : 'offline'} mr-2`}></div>
              <p className="text-xs text-slate-400">
                {systemStatus?.argus_running ? 'Operational' : 'Not responding'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Measurements</p>
                <p className="text-xl font-bold text-blue-400">{systemStatus?.active_measurements || 0}</p>
              </div>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400 mt-3">Currently running tasks</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Monitoring Stations</p>
                <p className="text-xl font-bold text-cyan-400">{systemStatus?.stations?.length || 0}</p>
              </div>
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 mt-3">Connected stations</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">System Health</p>
                <p className={`text-xl font-bold ${getStatusColor(systemStatus?.system_health === 'Good')}`}>
                  {systemStatus?.system_health || 'Unknown'}
                </p>
              </div>
              <Monitor className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-xs text-slate-400 mt-3">Overall status</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitoring Stations */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center">
              <Radio className="w-5 h-5 mr-2" />
              Monitoring Stations
            </CardTitle>
            <CardDescription>Active spectrum monitoring stations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemStatus?.stations && systemStatus.stations.length > 0 ? (
                systemStatus.stations.map((station, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div>
                        <h4 className="font-medium text-white">{station.name}</h4>
                        <p className="text-sm text-slate-400 capitalize flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {station.type} station
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      Online
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No monitoring stations detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Devices */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center">
              <Server className="w-5 h-5 mr-2" />
              System Devices
            </CardTitle>
            <CardDescription>Connected measurement equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemStatus?.devices && systemStatus.devices.length > 0 ? (
                systemStatus.devices.map((device, index) => {
                  const isOnline = device.state === 'operational';
                  return (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                        <div>
                          <h4 className="font-medium text-white">{device.name}</h4>
                          <p className="text-sm text-slate-400 capitalize flex items-center">
                            <Wifi className="w-3 h-3 mr-1" />
                            {device.state}
                          </p>
                        </div>
                      </div>
                      <Badge className={isOnline 
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }>
                        {isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No devices detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Information
          </CardTitle>
          <CardDescription>Detailed system status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                System Time
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Time:</span>
                  <span className="text-white font-mono">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Status Update:</span>
                  <span className="text-white font-mono">
                    {systemStatus?.last_update ? new Date(systemStatus.last_update).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center">
                <User className="w-4 h-4 mr-2" />
                System User
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current User:</span>
                  <span className="text-white">System Admin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Access Level:</span>
                  <span className="text-green-300">Full Control</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                Performance
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">CPU Usage:</span>
                  <span className="text-green-300">Normal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Memory:</span>
                  <span className="text-green-300">Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          {!systemStatus?.argus_running && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h4 className="font-semibold text-red-300">System Alert</h4>
              </div>
              <p className="text-red-200 mt-2">Argus system is not running. Please check the system configuration and restart if necessary.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
