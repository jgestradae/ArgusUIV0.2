import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import {
  X,
  Table as TableIcon,
  BarChart3,
  Edit,
  Save,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
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
  EDIT: 'edit'
};

const GRAPH_TYPES = {
  LEVEL_VS_TIME: 'level_vs_time',
  LEVEL_VS_FREQUENCY: 'level_vs_frequency',
  SPECTROGRAM_2D: 'spectrogram_2d',
  VIEW_3D: 'view_3d'
};

export default function UniversalDataViewer({ item, dataType, onClose, onSave }) {
  const [viewMode, setViewMode] = useState(VIEW_MODES.TEXT);
  const [graphType, setGraphType] = useState(GRAPH_TYPES.LEVEL_VS_TIME);
  const [itemData, setItemData] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markers, setMarkers] = useState([]);  // Array of {x, y, index} objects
  const [showMarkerControls, setShowMarkerControls] = useState(false);

  useEffect(() => {
    loadItemData();
  }, [item]);

  const loadItemData = async () => {
    try {
      setLoading(true);
      
      // Load data based on type
      if (dataType === 'measurement_result') {
        const response = await axios.get(`${API}/measurements/${item.order_id}/data`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
        });
        setItemData(response.data);
      } else if (dataType === 'automatic_definition') {
        // For AMM, fetch full configuration details
        const response = await axios.get(`${API}/amm/configurations/${item.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
        });
        setItemData(response.data);
        setEditedData(response.data);
      } else if (dataType === 'frequency_list') {
        // Frequency list data
        setItemData({ frequencies: item.frequencies || [], ...item });
      } else if (dataType === 'transmitter_list') {
        // Transmitter list data
        setItemData({ transmitters: item.transmitters || [], ...item });
      } else {
        // Default: use item as-is
        setItemData(item);
      }
    } catch (error) {
      console.error('Error loading item data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (dataType === 'automatic_definition') {
        await axios.put(`${API}/amm/configurations/${item.id}`, editedData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
        });
        toast.success('Configuration updated successfully');
        if (onSave) onSave();
      }
      
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const formatFrequency = (hz) => {
    if (hz >= 1000000) return `${(hz / 1000000).toFixed(3)} MHz`;
    if (hz >= 1000) return `${(hz / 1000).toFixed(3)} kHz`;
    return `${hz} Hz`;
  };

  const addMarker = (data, index) => {
    if (markers.length >= 4) {
      toast.error('Maximum 4 markers allowed');
      return;
    }
    
    const newMarker = {
      id: Date.now(),
      index: index,
      ...data
    };
    
    setMarkers(prev => [...prev, newMarker]);
    toast.success(`Marker ${markers.length + 1} added`);
  };

  const removeMarker = (markerId) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
    toast.success('Marker removed');
  };

  const clearAllMarkers = () => {
    setMarkers([]);
    toast.success('All markers cleared');
  };

  // Render measurement result as table
  const renderMeasurementTable = () => {
    if (!itemData || !itemData.data_points || itemData.data_points.length === 0) {
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
              <th className="border border-slate-700 p-2 text-left text-sm">#</th>
              <th className="border border-slate-700 p-2 text-left text-sm">Timestamp</th>
              <th className="border border-slate-700 p-2 text-right text-sm">Frequency</th>
              <th className="border border-slate-700 p-2 text-right text-sm">Level (dBm)</th>
              {itemData.data_points[0]?.bearing_deg && (
                <th className="border border-slate-700 p-2 text-right text-sm">Bearing (°)</th>
              )}
              {itemData.data_points[0]?.level_unit && (
                <th className="border border-slate-700 p-2 text-center text-sm">Unit</th>
              )}
            </tr>
          </thead>
          <tbody>
            {itemData.data_points.map((point, index) => (
              <tr key={index} className="hover:bg-slate-700/30">
                <td className="border border-slate-700 p-2 text-slate-400 text-sm">{index + 1}</td>
                <td className="border border-slate-700 p-2 text-slate-300 text-xs">
                  {point.timestamp ? new Date(point.timestamp).toLocaleString() : 'N/A'}
                </td>
                <td className="border border-slate-700 p-2 text-right text-slate-300 text-sm">
                  {point.frequency_hz ? formatFrequency(parseInt(point.frequency_hz)) : 'N/A'}
                </td>
                <td className="border border-slate-700 p-2 text-right font-mono text-blue-300 text-sm">
                  {point.level_dbm ? parseFloat(point.level_dbm).toFixed(1) : 'N/A'}
                </td>
                {point.bearing_deg && (
                  <td className="border border-slate-700 p-2 text-right text-slate-300 text-sm">
                    {parseFloat(point.bearing_deg).toFixed(1)}°
                  </td>
                )}
                {point.level_unit && (
                  <td className="border border-slate-700 p-2 text-center text-slate-400 text-xs">
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

  // Render AMM configuration editor
  const renderAMMEditor = () => {
    if (!itemData) return null;

    return (
      <div className="space-y-6 max-h-[600px] overflow-auto">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuration Details
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Name</Label>
              <Input
                value={editedData.name || ''}
                onChange={(e) => setEditedData({...editedData, name: e.target.value})}
                className="input-spectrum mt-1"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Status</Label>
              <Select
                value={editedData.status || 'draft'}
                onValueChange={(value) => setEditedData({...editedData, status: value})}
              >
                <SelectTrigger className="input-spectrum mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={editedData.description || ''}
              onChange={(e) => setEditedData({...editedData, description: e.target.value})}
              className="input-spectrum mt-1"
              rows={3}
            />
          </div>
        </div>

        {/* Properties Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">AMM Parameters</h3>
          
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-800">
                <tr>
                  <th className="border border-slate-700 p-3 text-left text-slate-300">Property</th>
                  <th className="border border-slate-700 p-3 text-left text-slate-300">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Configuration ID</td>
                  <td className="border border-slate-700 p-3 text-slate-300 font-mono text-sm">{itemData.id}</td>
                </tr>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Created At</td>
                  <td className="border border-slate-700 p-3 text-slate-300">
                    {itemData.created_at ? new Date(itemData.created_at).toLocaleString() : 'N/A'}
                  </td>
                </tr>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Created By</td>
                  <td className="border border-slate-700 p-3 text-slate-300">{itemData.created_by || 'N/A'}</td>
                </tr>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Execution Count</td>
                  <td className="border border-slate-700 p-3 text-slate-300">{itemData.execution_count || 0}</td>
                </tr>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Error Count</td>
                  <td className="border border-slate-700 p-3 text-slate-300">{itemData.error_count || 0}</td>
                </tr>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Last Execution</td>
                  <td className="border border-slate-700 p-3 text-slate-300">
                    {itemData.last_execution ? new Date(itemData.last_execution).toLocaleString() : 'Never'}
                  </td>
                </tr>
                <tr className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-3 text-slate-400">Next Execution</td>
                  <td className="border border-slate-700 p-3 text-slate-300">
                    {itemData.next_execution ? new Date(itemData.next_execution).toLocaleString() : 'Not scheduled'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="btn-spectrum">
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Render frequency/transmitter list
  const renderListView = () => {
    if (dataType === 'frequency_list' && itemData?.frequencies) {
      return (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="border border-slate-700 p-2 text-left">#</th>
                <th className="border border-slate-700 p-2 text-right">Frequency</th>
                <th className="border border-slate-700 p-2 text-left">Service</th>
              </tr>
            </thead>
            <tbody>
              {itemData.frequencies.map((freq, index) => (
                <tr key={index} className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-2 text-slate-400">{index + 1}</td>
                  <td className="border border-slate-700 p-2 text-right text-blue-300 font-mono">
                    {formatFrequency(freq.frequency)}
                  </td>
                  <td className="border border-slate-700 p-2 text-slate-300">{freq.service || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (dataType === 'transmitter_list' && itemData?.transmitters) {
      return (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="border border-slate-700 p-2 text-left">#</th>
                <th className="border border-slate-700 p-2 text-left">Name</th>
                <th className="border border-slate-700 p-2 text-right">Frequency</th>
                <th className="border border-slate-700 p-2 text-left">Location</th>
              </tr>
            </thead>
            <tbody>
              {itemData.transmitters.map((tx, index) => (
                <tr key={index} className="hover:bg-slate-700/30">
                  <td className="border border-slate-700 p-2 text-slate-400">{index + 1}</td>
                  <td className="border border-slate-700 p-2 text-slate-300">{tx.name || 'N/A'}</td>
                  <td className="border border-slate-700 p-2 text-right text-blue-300 font-mono">
                    {formatFrequency(tx.frequency)}
                  </td>
                  <td className="border border-slate-700 p-2 text-slate-300">
                    {tx.latitude && tx.longitude ? `${tx.latitude.toFixed(4)}, ${tx.longitude.toFixed(4)}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <div className="text-center py-12 text-slate-400">No data available</div>;
  };

  // Render graph view
  const renderGraphView = () => {
    if (dataType !== 'measurement_result' || !itemData || !itemData.data_points) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Graph view not available for this data type</p>
        </div>
      );
    }

    let chartData = [];
    
    if (graphType === GRAPH_TYPES.LEVEL_VS_TIME) {
      chartData = itemData.data_points.map((point, index) => ({
        index: index + 1,
        time: point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : `Point ${index + 1}`,
        level: parseFloat(point.level_dbm),
        timestamp: point.timestamp
      }));
    } else if (graphType === GRAPH_TYPES.LEVEL_VS_FREQUENCY) {
      chartData = itemData.data_points.map((point) => ({
        frequency: parseInt(point.frequency_hz) / 1000000,
        level: parseFloat(point.level_dbm),
        timestamp: point.timestamp
      }));
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select value={graphType} onValueChange={setGraphType}>
            <SelectTrigger className="w-64 input-spectrum">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GRAPH_TYPES.LEVEL_VS_TIME}>Level vs Time</SelectItem>
              <SelectItem value={GRAPH_TYPES.LEVEL_VS_FREQUENCY}>Level vs Frequency</SelectItem>
              <SelectItem value={GRAPH_TYPES.SPECTROGRAM_2D} disabled>2D Spectrogram (Coming Soon)</SelectItem>
              <SelectItem value={GRAPH_TYPES.VIEW_3D} disabled>3D View (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm"><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm"><ZoomOut className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm"><Maximize2 className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            {graphType === GRAPH_TYPES.LEVEL_VS_TIME ? (
              <LineChart 
                data={chartData}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const point = data.activePayload[0].payload;
                    addMarker({
                      time: point.time,
                      level: point.level,
                      timestamp: point.timestamp
                    }, point.index);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                <Legend />
                <Line type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} name="Level (dBm)" />
                {/* Render markers */}
                {markers.map((marker, idx) => (
                  <Line
                    key={marker.id}
                    type="monotone"
                    dataKey={() => marker.level}
                    stroke={['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx]}
                    strokeWidth={0}
                    dot={(props) => {
                      if (props.payload && props.payload.index === marker.index) {
                        return (
                          <g>
                            <circle cx={props.cx} cy={props.cy} r={6} fill={['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx]} stroke="#fff" strokeWidth={2} />
                            <text x={props.cx} y={props.cy - 12} textAnchor="middle" fill="#fff" fontSize={10}>M{idx + 1}</text>
                          </g>
                        );
                      }
                      return null;
                    }}
                  />
                ))}
              </LineChart>
            ) : (
              <ScatterChart 
                data={chartData}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const point = data.activePayload[0].payload;
                    addMarker({
                      frequency: point.frequency,
                      level: point.level,
                      timestamp: point.timestamp
                    }, chartData.findIndex(p => p.frequency === point.frequency && p.level === point.level));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="frequency" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                <Legend />
                <Scatter dataKey="level" fill="#3b82f6" name="Level (dBm)" />
                {/* Render markers */}
                {markers.map((marker, idx) => (
                  <Scatter
                    key={marker.id}
                    data={[marker]}
                    fill={['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx]}
                    shape={(props) => (
                      <g>
                        <circle cx={props.cx} cy={props.cy} r={8} fill={['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx]} stroke="#fff" strokeWidth={2} />
                        <text x={props.cx} y={props.cy - 15} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold">M{idx + 1}</text>
                      </g>
                    )}
                  />
                ))}
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Marker Controls */}
        {markers.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Markers ({markers.length}/4)
              </h4>
              <Button variant="ghost" size="sm" onClick={clearAllMarkers}>
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {markers.map((marker, idx) => (
                <div key={marker.id} className="flex items-center justify-between bg-slate-700/30 rounded p-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx] }}
                    >
                      M{idx + 1}
                    </div>
                    <div className="text-xs">
                      {graphType === GRAPH_TYPES.LEVEL_VS_TIME ? (
                        <>
                          <div className="text-slate-300">{marker.time}</div>
                          <div className="text-blue-300 font-mono">{marker.level?.toFixed(1)} dBm</div>
                        </>
                      ) : (
                        <>
                          <div className="text-slate-300">{marker.frequency?.toFixed(3)} MHz</div>
                          <div className="text-blue-300 font-mono">{marker.level?.toFixed(1)} dBm</div>
                        </>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeMarker(marker.id)}
                    className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">Click on the graph to add markers (max 4)</p>
          </div>
        )}

        {/* Statistics */}
        {itemData.data_points.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Data Points</div>
              <div className="text-lg font-semibold text-white">{itemData.data_points.length}</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Min Level</div>
              <div className="text-lg font-semibold text-green-300">
                {Math.min(...itemData.data_points.map(p => parseFloat(p.level_dbm))).toFixed(1)} dBm
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Max Level</div>
              <div className="text-lg font-semibold text-red-300">
                {Math.max(...itemData.data_points.map(p => parseFloat(p.level_dbm))).toFixed(1)} dBm
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Avg Level</div>
              <div className="text-lg font-semibold text-blue-300">
                {(itemData.data_points.reduce((sum, p) => sum + parseFloat(p.level_dbm), 0) / itemData.data_points.length).toFixed(1)} dBm
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getTitle = () => {
    if (dataType === 'measurement_result') return `Measurement: ${item.order_id}`;
    if (dataType === 'automatic_definition') return `AMM Configuration: ${item.name}`;
    if (dataType === 'frequency_list') return `Frequency List: ${item.name || item.order_id}`;
    if (dataType === 'transmitter_list') return `Transmitter List: ${item.name || item.order_id}`;
    return `Viewing: ${item.name || item.id}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="glass-card border-0 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white">{getTitle()}</CardTitle>
              <div className="flex items-center space-x-3 mt-2">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {dataType.replace('_', ' ').toUpperCase()}
                </Badge>
                {item.status && (
                  <Badge className={`${
                    item.status === 'active' || item.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                    item.status === 'draft' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                    'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }`}>
                    {item.status}
                  </Badge>
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
              {dataType === 'automatic_definition' ? 'View Properties' : 'Text View'}
            </Button>
            
            {dataType === 'measurement_result' && (
              <Button
                variant={viewMode === VIEW_MODES.GRAPH ? 'default' : 'ghost'}
                onClick={() => setViewMode(VIEW_MODES.GRAPH)}
                className={viewMode === VIEW_MODES.GRAPH ? 'btn-spectrum' : ''}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Graph View
              </Button>
            )}

            {dataType === 'automatic_definition' && (
              <Button
                variant={viewMode === VIEW_MODES.EDIT ? 'default' : 'ghost'}
                onClick={() => setViewMode(VIEW_MODES.EDIT)}
                className={viewMode === VIEW_MODES.EDIT ? 'btn-spectrum' : ''}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Configuration
              </Button>
            )}

            <div className="flex-1"></div>

            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading data...</p>
            </div>
          ) : (
            <>
              {dataType === 'measurement_result' && viewMode === VIEW_MODES.TEXT && renderMeasurementTable()}
              {dataType === 'measurement_result' && viewMode === VIEW_MODES.GRAPH && renderGraphView()}
              {dataType === 'automatic_definition' && viewMode === VIEW_MODES.TEXT && renderAMMEditor()}
              {dataType === 'automatic_definition' && viewMode === VIEW_MODES.EDIT && renderAMMEditor()}
              {(dataType === 'frequency_list' || dataType === 'transmitter_list') && renderListView()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
