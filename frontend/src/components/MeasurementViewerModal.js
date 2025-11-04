import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  X,
  Table as TableIcon,
  BarChart3,
  Volume2,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VIEW_MODES = {
  TEXT: 'text',
  GRAPH: 'graph',
  AUDIO: 'audio'
};

const GRAPH_TYPES = {
  LEVEL_VS_TIME: 'level_vs_time',
  LEVEL_VS_FREQUENCY: 'level_vs_frequency',
  SPECTROGRAM_2D: 'spectrogram_2d',
  VIEW_3D: 'view_3d'
};

export default function MeasurementViewerModal({ measurement, onClose }) {
  const [viewMode, setViewMode] = useState(VIEW_MODES.TEXT);
  const [graphType, setGraphType] = useState(GRAPH_TYPES.LEVEL_VS_TIME);
  const [measurementData, setMeasurementData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeasurementData();
  }, [measurement]);

  const loadMeasurementData = async () => {
    try {
      setLoading(true);
      
      // Fetch the actual measurement data from CSV or XML
      const response = await axios.get(`${API}/measurements/${measurement.order_id}/data`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
      });
      
      setMeasurementData(response.data);
    } catch (error) {
      console.error('Error loading measurement data:', error);
      toast.error('Failed to load measurement data');
    } finally {
      setLoading(false);
    }
  };

  const formatFrequency = (hz) => {
    if (hz >= 1000000) return `${(hz / 1000000).toFixed(3)} MHz`;
    if (hz >= 1000) return `${(hz / 1000).toFixed(3)} kHz`;
    return `${hz} Hz`;
  };

  const renderTextView = () => {
    if (!measurementData || !measurementData.data_points) {
      return (
        <div className="text-center py-12">
          <TableIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No measurement data available</p>
        </div>
      );
    }

    return (
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="border border-slate-700 p-2 text-left">#</th>
              <th className="border border-slate-700 p-2 text-left">Timestamp</th>
              <th className="border border-slate-700 p-2 text-right">Frequency</th>
              <th className="border border-slate-700 p-2 text-right">Level (dBm)</th>
              {measurementData.data_points[0]?.bearing_deg && (
                <th className="border border-slate-700 p-2 text-right">Bearing (°)</th>
              )}
              {measurementData.data_points[0]?.level_unit && (
                <th className="border border-slate-700 p-2 text-center">Unit</th>
              )}
            </tr>
          </thead>
          <tbody>
            {measurementData.data_points.map((point, index) => (
              <tr key={index} className="hover:bg-slate-700/30">
                <td className="border border-slate-700 p-2 text-slate-400">{index + 1}</td>
                <td className="border border-slate-700 p-2 text-slate-300 text-sm">
                  {new Date(point.timestamp).toLocaleTimeString()}
                </td>
                <td className="border border-slate-700 p-2 text-right text-slate-300">
                  {formatFrequency(parseInt(point.frequency_hz))}
                </td>
                <td className="border border-slate-700 p-2 text-right font-mono text-blue-300">
                  {parseFloat(point.level_dbm).toFixed(1)}
                </td>
                {point.bearing_deg && (
                  <td className="border border-slate-700 p-2 text-right text-slate-300">
                    {parseFloat(point.bearing_deg).toFixed(1)}°
                  </td>
                )}
                {point.level_unit && (
                  <td className="border border-slate-700 p-2 text-center text-slate-400">
                    {point.level_unit}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGraphView = () => {
    if (!measurementData || !measurementData.data_points) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No data available for visualization</p>
        </div>
      );
    }

    // Prepare data based on graph type
    let chartData = [];
    
    if (graphType === GRAPH_TYPES.LEVEL_VS_TIME) {
      chartData = measurementData.data_points.map((point, index) => ({
        index: index + 1,
        time: new Date(point.timestamp).toLocaleTimeString(),
        level: parseFloat(point.level_dbm),
        timestamp: point.timestamp
      }));
    } else if (graphType === GRAPH_TYPES.LEVEL_VS_FREQUENCY) {
      chartData = measurementData.data_points.map((point) => ({
        frequency: parseInt(point.frequency_hz) / 1000000, // Convert to MHz
        level: parseFloat(point.level_dbm),
        timestamp: point.timestamp
      }));
    }

    return (
      <div className="space-y-4">
        {/* Graph Type Selector */}
        <div className="flex items-center justify-between">
          <Select value={graphType} onValueChange={setGraphType}>
            <SelectTrigger className="w-64 input-spectrum">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GRAPH_TYPES.LEVEL_VS_TIME}>
                Level vs Time
              </SelectItem>
              <SelectItem value={GRAPH_TYPES.LEVEL_VS_FREQUENCY}>
                Level vs Frequency
              </SelectItem>
              <SelectItem value={GRAPH_TYPES.SPECTROGRAM_2D} disabled>
                2D Spectrogram (Coming Soon)
              </SelectItem>
              <SelectItem value={GRAPH_TYPES.VIEW_3D} disabled>
                3D View (Coming Soon)
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-800/30 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            {graphType === GRAPH_TYPES.LEVEL_VS_TIME ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Level (dBm)"
                />
              </LineChart>
            ) : (
              <ScatterChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="frequency" 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Scatter 
                  dataKey="level" 
                  fill="#3b82f6" 
                  name="Level (dBm)"
                />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Data Points</div>
            <div className="text-lg font-semibold text-white">
              {measurementData.data_points.length}
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Min Level</div>
            <div className="text-lg font-semibold text-green-300">
              {Math.min(...measurementData.data_points.map(p => parseFloat(p.level_dbm))).toFixed(1)} dBm
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Max Level</div>
            <div className="text-lg font-semibold text-red-300">
              {Math.max(...measurementData.data_points.map(p => parseFloat(p.level_dbm))).toFixed(1)} dBm
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Avg Level</div>
            <div className="text-lg font-semibold text-blue-300">
              {(measurementData.data_points.reduce((sum, p) => sum + parseFloat(p.level_dbm), 0) / measurementData.data_points.length).toFixed(1)} dBm
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="glass-card border-0 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white">Measurement Viewer</CardTitle>
              <div className="flex items-center space-x-3 mt-2">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {measurement.order_id}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {measurement.measurement_type}
                </Badge>
                <span className="text-sm text-slate-400">
                  Station: {measurement.station_name}
                </span>
                {measurement.frequency_single && (
                  <span className="text-sm text-slate-400">
                    {formatFrequency(measurement.frequency_single)}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-6">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2 mb-6">
            <Button
              variant={viewMode === VIEW_MODES.TEXT ? 'default' : 'ghost'}
              onClick={() => setViewMode(VIEW_MODES.TEXT)}
              className={viewMode === VIEW_MODES.TEXT ? 'btn-spectrum' : ''}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Text View
            </Button>
            <Button
              variant={viewMode === VIEW_MODES.GRAPH ? 'default' : 'ghost'}
              onClick={() => setViewMode(VIEW_MODES.GRAPH)}
              className={viewMode === VIEW_MODES.GRAPH ? 'btn-spectrum' : ''}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Graph View
            </Button>
            <Button
              variant="ghost"
              disabled
              className="opacity-50 cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Audio (Coming Soon)
            </Button>

            <div className="flex-1"></div>

            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading measurement data...</p>
            </div>
          ) : (
            <>
              {viewMode === VIEW_MODES.TEXT && renderTextView()}
              {viewMode === VIEW_MODES.GRAPH && renderGraphView()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
