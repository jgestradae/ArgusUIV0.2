import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Activity, 
  Radio,
  TrendingUp,
  Download,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export default function MeasurementVisualization({ measurementId, measurementType, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line'); // line, area, bar

  useEffect(() => {
    loadMeasurementData();
  }, [measurementId]);

  const loadMeasurementData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/measurements/${measurementId}/data`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading measurement data:', error);
      toast.error('Failed to load measurement data');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!data || !data.data || data.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No data available</p>
          </div>
        </div>
      );
    }

    const chartData = data.data;

    // FFM - Time Series
    if (data.measurement_type === 'FFM') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8"
                label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8"
                label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="level" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={false}
                name="Signal Level"
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
                stroke="#94a3b8"
                label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8"
                label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="level" 
                stroke="#06b6d4" 
                fill="#06b6d4"
                fillOpacity={0.3}
                name="Signal Level"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      );
    }

    // SCAN/PSCAN - Spectrum
    if (data.measurement_type === 'SCAN' || data.measurement_type === 'PSCAN') {
      // Convert frequency to MHz for display
      const displayData = chartData.map(point => ({
        ...point,
        freq_mhz: point.frequency / 1000000
      }));

      return (
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="freq_mhz" 
                stroke="#94a3b8"
                label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8"
                label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'level') return [`${value.toFixed(2)} dBm`, 'Level'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="level" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={false}
                name="Signal Level"
              />
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="freq_mhz" 
                stroke="#94a3b8"
                label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8"
                label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="level" 
                stroke="#06b6d4" 
                fill="#06b6d4"
                fillOpacity={0.3}
                name="Signal Level"
              />
            </AreaChart>
          ) : (
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="freq_mhz" 
                stroke="#94a3b8"
                label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis 
                stroke="#94a3b8"
                label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Legend />
              <Bar 
                dataKey="level" 
                fill="#06b6d4"
                name="Signal Level"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      );
    }

    // DSCAN - Polar/Radar Chart for Direction Finding
    if (data.measurement_type === 'DSCAN') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="angle" stroke="#94a3b8" />
            <PolarRadiusAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            />
            <Legend />
            <Radar 
              name="Signal Level" 
              dataKey="level" 
              stroke="#06b6d4" 
              fill="#06b6d4" 
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const getChartTitle = () => {
    if (!data) return 'Measurement Visualization';
    
    switch (data.measurement_type) {
      case 'FFM':
        return `Fixed Frequency - ${(data.frequency / 1000000).toFixed(2)} MHz`;
      case 'SCAN':
        return `Frequency Scan - ${(data.frequency_start / 1000000).toFixed(0)} - ${(data.frequency_stop / 1000000).toFixed(0)} MHz`;
      case 'PSCAN':
        return `Panoramic Scan - ${(data.frequency_start / 1000000).toFixed(0)} - ${(data.frequency_stop / 1000000).toFixed(0)} MHz`;
      case 'DSCAN':
        return `Direction Finding - ${(data.frequency / 1000000).toFixed(2)} MHz`;
      default:
        return 'Measurement Visualization';
    }
  };

  const exportData = () => {
    if (!data || !data.data) return;
    
    // Convert to CSV
    const headers = Object.keys(data.data[0]).join(',');
    const rows = data.data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `measurement_${measurementId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
  };

  if (loading) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="ml-3 text-slate-400">Loading measurement data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-white flex items-center">
              <Radio className="w-5 h-5 mr-2" />
              {getChartTitle()}
            </CardTitle>
            <CardDescription>
              {data?.measurement_type && (
                <Badge className="mt-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  {data.measurement_type}
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadMeasurementData}
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportData}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            {onClose && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart Type Selector */}
        {data && data.measurement_type !== 'DSCAN' && (
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm text-slate-400">Chart Type:</span>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              Area
            </Button>
            {data.measurement_type !== 'FFM' && (
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          {renderChart()}
        </div>

        {/* Stats */}
        {data && data.data && data.data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-slate-800/30 rounded-lg">
              <p className="text-xs text-slate-400">Data Points</p>
              <p className="text-lg font-medium text-white">{data.data.length}</p>
            </div>
            {data.measurement_type === 'FFM' && (
              <>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-400">Avg Level</p>
                  <p className="text-lg font-medium text-white">
                    {(data.data.reduce((sum, p) => sum + p.level, 0) / data.data.length).toFixed(2)} dBm
                  </p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-400">Min Level</p>
                  <p className="text-lg font-medium text-white">
                    {Math.min(...data.data.map(p => p.level)).toFixed(2)} dBm
                  </p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-400">Max Level</p>
                  <p className="text-lg font-medium text-white">
                    {Math.max(...data.data.map(p => p.level)).toFixed(2)} dBm
                  </p>
                </div>
              </>
            )}
            {(data.measurement_type === 'SCAN' || data.measurement_type === 'PSCAN') && (
              <>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-400">Bandwidth</p>
                  <p className="text-lg font-medium text-white">
                    {((data.frequency_stop - data.frequency_start) / 1000000).toFixed(0)} MHz
                  </p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-400">Peak Level</p>
                  <p className="text-lg font-medium text-white">
                    {Math.max(...data.data.map(p => p.level)).toFixed(2)} dBm
                  </p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg">
                  <p className="text-xs text-slate-400">Avg Level</p>
                  <p className="text-lg font-medium text-white">
                    {(data.data.reduce((sum, p) => sum + p.level, 0) / data.data.length).toFixed(2)} dBm
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
