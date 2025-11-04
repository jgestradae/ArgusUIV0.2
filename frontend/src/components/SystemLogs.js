import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { 
  FileText, 
  RefreshCw,
  Search,
  Filter,
  Download,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Activity
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLogs();
    loadOrders();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadLogs();
      loadOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (levelFilter) params.append('level', levelFilter);
      
      const response = await axios.get(`${API}/logs?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Failed to load system logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await axios.get(`${API}/measurements/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const refreshLogs = () => {
    loadLogs();
    loadOrders();
  };

  const exportLogs = () => {
    const filteredLogs = getFilteredLogs();
    const csvContent = [
      ['Timestamp', 'Level', 'Source', 'Message', 'User ID', 'Order ID'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.source,
        `"${log.message.replace(/"/g, '""')}"`,
        log.user_id || '',
        log.order_id || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `argus_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Logs exported successfully');
  };

  const getLogIcon = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = !levelFilter || log.level.toLowerCase() === levelFilter.toLowerCase();
      const matchesSource = !sourceFilter || log.source.toLowerCase() === sourceFilter.toLowerCase();
      
      return matchesSearch && matchesLevel && matchesSource;
    });
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.order_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700/50 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
        </div>
        <div className="h-96 bg-slate-700/30 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  const filteredLogs = getFilteredLogs();
  const filteredOrders = getFilteredOrders();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Logs</h1>
          <p className="text-slate-400">Monitor system events and measurement history</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportLogs} variant="secondary" className="btn-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={refreshLogs} disabled={refreshing} className="btn-spectrum">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-spectrum pl-10"
              />
            </div>
            
            <Select value={levelFilter || "all"} onValueChange={(val) => setLevelFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="input-spectrum">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter || "all"} onValueChange={(val) => setSourceFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="input-spectrum">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="xml_processor">XML Processor</SelectItem>
                <SelectItem value="argus">Argus</SelectItem>
                <SelectItem value="auth">AUTH</SelectItem>
                <SelectItem value="file_watcher">FILE_WATCHER</SelectItem>
                <SelectItem value="amm_scheduler">AMM_SCHEDULER</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => {
                setSearchTerm('');
                setLevelFilter('');
                setSourceFilter('');
                loadLogs();
              }}
              variant="secondary"
              className="btn-secondary"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Logs */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                System Events ({filteredLogs.length})
              </CardTitle>
              <CardDescription>Real-time system and application logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-700/40 transition-colors">
                    <div className="mt-1">
                      {getLogIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                            {log.source}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs text-slate-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-sm text-white break-words">{log.message}</p>
                      {(log.user_id || log.order_id) && (
                        <div className="flex items-center space-x-3 mt-2 text-xs text-slate-400">
                          {log.user_id && (
                            <div className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              User: {log.user_id}
                            </div>
                          )}
                          {log.order_id && (
                            <div className="flex items-center">
                              <Activity className="w-3 h-3 mr-1" />
                              Order: {log.order_id}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No logs match your criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Measurement Orders */}
        <div>
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Measurement Orders ({filteredOrders.length})
              </CardTitle>
              <CardDescription>Recent measurement requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                  <div key={order.id} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white text-sm truncate">{order.order_name}</span>
                      <Badge className={getOrderStateColor(order.order_state)}>
                        {order.order_state}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>ID:</span>
                        <span className="font-mono">{order.order_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{order.order_type}</span>
                      </div>
                      {order.suborder_task && (
                        <div className="flex justify-between">
                          <span>Task:</span>
                          <span>{order.suborder_task}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      {order.completed_at && (
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span>{new Date(order.completed_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {order.error_message && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-200">
                        <strong>Error:</strong> {order.error_message}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No orders match your criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
