import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Activity, 
  Radio, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  FileText,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [systemStatus, setSystemStatus] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statusResponse, ordersResponse] = await Promise.all([
        axios.get(`${API}/system/status`),
        axios.get(`${API}/measurements/orders`)
      ]);
      
      setSystemStatus(statusResponse.data);
      setRecentOrders(ordersResponse.data.slice(0, 5)); // Latest 5 orders
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Good':
      case 'operational':
        return 'text-green-400';
      case 'Warning':
        return 'text-yellow-400';
      case 'Error':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700/50 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-700/30 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">{t('dashboard.title')}</h1>
        <p className="text-slate-400">{t('dashboard.welcome')}, {user?.username}</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Argus Status</p>
                <p className={`text-2xl font-bold ${getStatusColor(systemStatus?.system_health)}`}>
                  {systemStatus?.argus_running ? 'Online' : 'Offline'}
                </p>
              </div>
              <Activity className={`w-8 h-8 ${getStatusColor(systemStatus?.system_health)}`} />
            </div>
            <div className="flex items-center mt-4">
              <div className={`status-indicator ${systemStatus?.argus_running ? 'online' : 'offline'} mr-2`}></div>
              <p className="text-xs text-slate-400">Last updated: {new Date(systemStatus?.last_update).toLocaleTimeString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Measurements</p>
                <p className="text-2xl font-bold text-blue-400">{systemStatus?.active_measurements || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex items-center mt-4">
              <TrendingUp className="w-4 h-4 text-green-400 mr-2" />
              <p className="text-xs text-slate-400">Currently running</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Monitoring Stations</p>
                <p className="text-2xl font-bold text-cyan-400">{systemStatus?.stations?.length || 0}</p>
              </div>
              <Radio className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex items-center mt-4">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
              <p className="text-xs text-slate-400">All operational</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">System Health</p>
                <p className={`text-2xl font-bold ${getStatusColor(systemStatus?.system_health)}`}>
                  {systemStatus?.system_health || 'Unknown'}
                </p>
              </div>
              {systemStatus?.system_health === 'Good' ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              )}
            </div>
            <div className="flex items-center mt-4">
              <Clock className="w-4 h-4 text-slate-400 mr-2" />
              <p className="text-xs text-slate-400">Real-time monitoring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-xl text-white">Quick Actions</CardTitle>
          <CardDescription>Common spectrum monitoring tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link to="/direct-measurement">
              <Button className="w-full h-20 btn-spectrum flex-col space-y-2">
                <Zap className="w-6 h-6" />
                <span>Start Measurement</span>
              </Button>
            </Link>
            <Link to="/system-status">
              <Button variant="secondary" className="w-full h-20 btn-secondary flex-col space-y-2">
                <Activity className="w-6 h-6" />
                <span>System Status</span>
              </Button>
            </Link>
            <Link to="/data-navigator">
              <Button variant="secondary" className="w-full h-20 btn-secondary flex-col space-y-2">
                <Database className="w-6 h-6" />
                <span>Data Navigator</span>
              </Button>
            </Link>
            <Link to="/configuration">
              <Button variant="secondary" className="w-full h-20 btn-secondary flex-col space-y-2">
                <Settings className="w-6 h-6" />
                <span>Configuration</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders and System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest measurement requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div>
                    <p className="font-medium text-white">{order.order_name}</p>
                    <p className="text-sm text-slate-400">{order.order_type} - {new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <Badge className={getOrderStateColor(order.order_state)}>
                    {order.order_state}
                  </Badge>
                </div>
              )) : (
                <p className="text-slate-400 text-center py-4">No recent orders</p>
              )}
            </div>
            <Link to="/logs">
              <Button variant="ghost" className="w-full mt-4 text-blue-400 hover:text-blue-300">
                View All Orders →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Devices */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center">
              <Radio className="w-5 h-5 mr-2" />
              System Devices
            </CardTitle>
            <CardDescription>Connected monitoring equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemStatus?.devices?.length > 0 ? systemStatus.devices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`status-indicator ${device.state === 'operational' ? 'online' : 'offline'}`}></div>
                    <div>
                      <p className="font-medium text-white">{device.name}</p>
                      <p className="text-sm text-slate-400 capitalize">{device.state}</p>
                    </div>
                  </div>
                  <Badge className={device.state === 'operational' 
                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }>
                    {device.state}
                  </Badge>
                </div>
              )) : (
                <p className="text-slate-400 text-center py-4">No devices detected</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
