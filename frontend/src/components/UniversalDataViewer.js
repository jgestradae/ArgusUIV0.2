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
  Settings,
  Radio,
  Target
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
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import Plotly from 'plotly.js-dist-min';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper component to display range definition
function RangeDefinitionView({ rangeDefId }) {
  const [rangeDef, setRangeDef] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRangeDef = async () => {
      try {
        const response = await axios.get(`${API}/amm/range-definitions/${rangeDefId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
        });
        setRangeDef(response.data);
      } catch (error) {
        console.error('Error loading range definition:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (rangeDefId) {
      fetchRangeDef();
    }
  }, [rangeDefId]);

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading range definition...</div>;
  }

  if (!rangeDef) {
    return <div className="text-slate-400 text-sm">No range definition found</div>;
  }

  return (
    <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-400">Frequency Range:</span>
          <span className="text-white ml-2 font-semibold">
            {rangeDef.frequency_range_low && rangeDef.frequency_range_high
              ? `${(rangeDef.frequency_range_low / 1000000).toFixed(0)} - ${(rangeDef.frequency_range_high / 1000000).toFixed(0)} MHz`
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Frequency Step:</span>
          <span className="text-white ml-2">
            {rangeDef.frequency_step ? `${(rangeDef.frequency_step / 1000).toFixed(0)} kHz` : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Date Range:</span>
          <span className="text-white ml-2">
            {rangeDef.date_range_start && rangeDef.date_range_end
              ? `${new Date(rangeDef.date_range_start).toLocaleDateString()} - ${new Date(rangeDef.date_range_end).toLocaleDateString()}`
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Time Range:</span>
          <span className="text-white ml-2">
            {rangeDef.time_range_start && rangeDef.time_range_end
              ? `${rangeDef.time_range_start} - ${rangeDef.time_range_end}`
              : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper component to display measurement definition
function MeasurementDefinitionView({ measurementDefId }) {
  const [measurementDef, setMeasurementDef] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeasurementDef = async () => {
      try {
        const response = await axios.get(`${API}/amm/measurement-definitions/${measurementDefId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
        });
        setMeasurementDef(response.data);
      } catch (error) {
        console.error('Error loading measurement definition:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (measurementDefId) {
      fetchMeasurementDef();
    }
  }, [measurementDefId]);

  if (loading) {
    return <div className="text-slate-400 text-sm">Loading measurement definition...</div>;
  }

  if (!measurementDef) {
    return <div className="text-slate-400 text-sm">No measurement definition found</div>;
  }

  return (
    <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-400">Measurement Type:</span>
          <span className="text-white ml-2 font-semibold">{measurementDef.measurement_type || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-400">Signal Path:</span>
          <span className="text-white ml-2">{measurementDef.signal_path || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-400">Frequency Mode:</span>
          <span className="text-white ml-2">{measurementDef.frequency_mode === 'S' ? 'Single' : 'Range'}</span>
        </div>
        <div>
          <span className="text-slate-400">Frequency:</span>
          <span className="text-white ml-2">
            {measurementDef.frequency_single 
              ? `${(measurementDef.frequency_single / 1000000).toFixed(1)} MHz` 
              : measurementDef.frequency_range_low 
              ? `${(measurementDef.frequency_range_low / 1000000).toFixed(0)}-${(measurementDef.frequency_range_high / 1000000).toFixed(0)} MHz`
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">IF Bandwidth:</span>
          <span className="text-white ml-2">{measurementDef.if_bandwidth ? `${measurementDef.if_bandwidth} Hz` : 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-400">Detector:</span>
          <span className="text-white ml-2">{measurementDef.detector || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-400">Demodulation:</span>
          <span className="text-white ml-2">{measurementDef.demodulation || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-400">Measurement Time:</span>
          <span className="text-white ml-2">{measurementDef.measurement_time ? `${measurementDef.measurement_time}s` : 'N/A'}</span>
        </div>
      </div>
      
      {measurementDef.measured_parameters && measurementDef.measured_parameters.length > 0 && (
        <div className="pt-2 border-t border-slate-700">
          <span className="text-slate-400 text-sm">Measured Parameters:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {measurementDef.measured_parameters.map((param, idx) => (
              <Badge key={idx} className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                {param}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [scans, setScans] = useState([]);  // Array of scans (grouped by time)
  const [selectedScanIndex, setSelectedScanIndex] = useState(0);
  const [isSingleScan, setIsSingleScan] = useState(true);
  const [selectedFrequency, setSelectedFrequency] = useState(null); // For Level vs Time: selected frequency to track
  const [availableFrequencies, setAvailableFrequencies] = useState([]); // List of available frequencies
  const plotly3DRef = React.useRef(null); // Ref for 3D plot container

  useEffect(() => {
    loadItemData();
  }, [item]);

  // 3D Plot rendering effect
  useEffect(() => {
    // Only render 3D plot when in graph mode, VIEW_3D is selected, and we have data
    if (viewMode === VIEW_MODES.GRAPH && graphType === GRAPH_TYPES.VIEW_3D && itemData && itemData.data_points && itemData.data_points.length > 0) {
      const timer = setTimeout(() => {
        render3DPlot();
      }, 100); // Small delay to ensure DOM is ready
      
      return () => clearTimeout(timer);
    }
  }, [viewMode, graphType, itemData]);

  const loadItemData = async () => {
    try {
      setLoading(true);
      
      // Load data based on type
      if (dataType === 'measurement_result') {
        const response = await axios.get(`${API}/measurements/${item.order_id}/data`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
        });
        setItemData(response.data);
        
        // Detect and group scans for scan measurements
        if (response.data.data_points && response.data.data_points.length > 0) {
          detectScans(response.data.data_points);
        }
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

  // Detect and group scans based on timestamp patterns
  const detectScans = (dataPoints) => {
    if (!dataPoints || dataPoints.length === 0) return;

    // Group data points by timestamp (assuming scans have the same or very close timestamps)
    const scanGroups = {};
    const timeThreshold = 1000; // 1 second threshold for grouping

    dataPoints.forEach((point, index) => {
      if (!point.timestamp) return;
      
      const timestamp = new Date(point.timestamp).getTime();
      let foundGroup = false;
      
      // Check if this point belongs to an existing scan group
      Object.keys(scanGroups).forEach(groupTime => {
        const groupTimestamp = parseInt(groupTime);
        if (Math.abs(timestamp - groupTimestamp) <= timeThreshold) {
          scanGroups[groupTime].push({ ...point, originalIndex: index });
          foundGroup = true;
        }
      });
      
      // If no group found, create a new one
      if (!foundGroup) {
        scanGroups[timestamp] = [{ ...point, originalIndex: index }];
      }
    });

    // Convert to array and sort by timestamp
    const detectedScans = Object.entries(scanGroups)
      .map(([timestamp, points]) => ({
        timestamp: parseInt(timestamp),
        points: points.sort((a, b) => (a.frequency_hz || 0) - (b.frequency_hz || 0)),
        scanNumber: 0 // Will be set below
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Assign scan numbers
    detectedScans.forEach((scan, index) => {
      scan.scanNumber = index + 1;
    });

    setScans(detectedScans);
    setIsSingleScan(detectedScans.length <= 1);
    
    // Extract unique frequencies for frequency selection (Level vs Time)
    const uniqueFreqs = [...new Set(dataPoints.map(p => p.frequency_hz))].sort((a, b) => a - b);
    setAvailableFrequencies(uniqueFreqs);
    if (uniqueFreqs.length > 0 && !selectedFrequency) {
      setSelectedFrequency(uniqueFreqs[0]); // Default to first frequency
    }
    
    if (detectedScans.length > 1) {
      console.log(`Detected ${detectedScans.length} scans in measurement data`);
      toast.success(`Detected ${detectedScans.length} scans in measurement data`);
    }
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
    toast.success(`Marker ${markers.length + 1} added at ${data.time || data.frequency}`);
  };

  const addMarkerAtPoint = (pointIndex) => {
    if (!itemData || !itemData.data_points) return;
    
    if (graphType === GRAPH_TYPES.LEVEL_VS_TIME) {
      const point = itemData.data_points[pointIndex];
      if (point) {
        addMarker({
          time: point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : `Point ${pointIndex + 1}`,
          level: parseFloat(point.level_dbm),
          timestamp: point.timestamp
        }, pointIndex + 1);
      }
    } else {
      const point = itemData.data_points[pointIndex];
      if (point) {
        addMarker({
          frequency: parseInt(point.frequency_hz) / 1000000,
          level: parseFloat(point.level_dbm),
          timestamp: point.timestamp
        }, pointIndex);
      }
    }
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

        {/* Measurement Definition Section */}
        {itemData.measurement_definition_id && (
          <div className="space-y-4 border-t border-slate-700 pt-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Radio className="w-5 h-5 mr-2" />
              Associated Measurement Definition
            </h3>
            <MeasurementDefinitionView measurementDefId={itemData.measurement_definition_id} />
          </div>
        )}

        {/* Range Definition Section */}
        {itemData.range_definition_id && (
          <div className="space-y-4 border-t border-slate-700 pt-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Associated Range Definition
            </h3>
            <RangeDefinitionView rangeDefId={itemData.range_definition_id} />
          </div>
        )}

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

  // Render 3D Surface Plot (Frequency × Time × Level)
  // Function to render 3D plot (non-React function, called from useEffect)
  const render3DPlot = () => {
    const plotDiv = plotly3DRef.current;
    if (!plotDiv || !itemData || !itemData.data_points) return;

    // Prepare data for 3D surface plot
    const surfaceData = {};
    const uniqueFrequencies = new Set();
    const uniqueTimestamps = new Set();

    itemData.data_points.forEach(point => {
      const freq = parseInt(point.frequency_hz) / 1000000; // Convert to MHz
      const timestamp = point.timestamp ? new Date(point.timestamp).getTime() : 0;
      const level = parseFloat(point.level_dbm);
      
      uniqueFrequencies.add(freq);
      uniqueTimestamps.add(timestamp);
      
      if (!surfaceData[timestamp]) {
        surfaceData[timestamp] = {};
      }
      surfaceData[timestamp][freq] = level;
    });

    const sortedFrequencies = Array.from(uniqueFrequencies).sort((a, b) => a - b);
    const sortedTimestamps = Array.from(uniqueTimestamps).sort((a, b) => a - b);

    // Create Z matrix (level values) for surface plot
    const zMatrix = sortedTimestamps.map(timestamp => 
      sortedFrequencies.map(freq => surfaceData[timestamp]?.[freq] || null)
    );

    // Convert timestamps to relative seconds from start
    const timeInSeconds = sortedTimestamps.map((timestamp, idx) => {
      if (idx === 0) return 0;
      return (timestamp - sortedTimestamps[0]) / 1000;
    });

    const trace = {
      type: 'surface',
      x: sortedFrequencies, // Frequency (MHz)
      y: timeInSeconds, // Time (seconds)
      z: zMatrix, // Level (dBm)
      colorscale: [
        [0, 'rgb(0,0,255)'],      // Blue (low)
        [0.25, 'rgb(0,255,255)'], // Cyan
        [0.5, 'rgb(0,255,0)'],    // Green
        [0.75, 'rgb(255,255,0)'], // Yellow
        [1, 'rgb(255,0,0)']       // Red (high)
      ],
      colorbar: {
        title: 'Level (dBm)',
        titleside: 'right',
        tickmode: 'linear',
        tick0: Math.min(...zMatrix.flat().filter(v => v !== null)),
        dtick: 10
      }
    };

    const layout = {
      title: {
        text: '3D Measurement Visualization',
        font: { color: '#fff' }
      },
      scene: {
        xaxis: { 
          title: 'Frequency (MHz)',
          gridcolor: '#444',
          zerolinecolor: '#444',
          color: '#94a3b8'
        },
        yaxis: { 
          title: 'Time (s)',
          gridcolor: '#444',
          zerolinecolor: '#444',
          color: '#94a3b8'
        },
        zaxis: { 
          title: 'Level (dBm)',
          gridcolor: '#444',
          zerolinecolor: '#444',
          color: '#94a3b8'
        },
        bgcolor: '#1e293b',
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.3 }
        }
      },
      paper_bgcolor: '#1e293b',
      plot_bgcolor: '#1e293b',
      font: { color: '#94a3b8' },
      autosize: true,
      margin: { l: 0, r: 0, t: 40, b: 0 }
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['sendDataToCloud'],
      modeBarButtonsToAdd: []
    };

    Plotly.newPlot(plotDiv, [trace], layout, config);
  };

  const render3DView = () => {
    if (!itemData || !itemData.data_points || itemData.data_points.length === 0) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No data available for 3D view</p>
        </div>
      );
    }

    // Calculate stats for display
    const surfaceData = {};
    const uniqueFrequencies = new Set();
    const uniqueTimestamps = new Set();
    const allLevels = [];

    itemData.data_points.forEach(point => {
      const freq = parseInt(point.frequency_hz) / 1000000;
      const timestamp = point.timestamp ? new Date(point.timestamp).getTime() : 0;
      const level = parseFloat(point.level_dbm);
      
      uniqueFrequencies.add(freq);
      uniqueTimestamps.add(timestamp);
      allLevels.push(level);
      
      if (!surfaceData[timestamp]) {
        surfaceData[timestamp] = {};
      }
      surfaceData[timestamp][freq] = level;
    });

    const sortedFrequencies = Array.from(uniqueFrequencies).sort((a, b) => a - b);
    const sortedTimestamps = Array.from(uniqueTimestamps).sort((a, b) => a - b);
    const timeInSeconds = sortedTimestamps.map((timestamp, idx) => {
      if (idx === 0) return 0;
      return (timestamp - sortedTimestamps[0]) / 1000;
    });

    // Graph Type Selector Panel
    const graphTypeSelector = (
      <div className="flex items-center space-x-3">
        <Select value={graphType} onValueChange={setGraphType}>
          <SelectTrigger className="w-64 input-spectrum">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GRAPH_TYPES.LEVEL_VS_TIME}>Level vs Time</SelectItem>
            <SelectItem value={GRAPH_TYPES.LEVEL_VS_FREQUENCY}>Level vs Frequency</SelectItem>
            <SelectItem value={GRAPH_TYPES.SPECTROGRAM_2D}>2D Spectrogram</SelectItem>
            <SelectItem value={GRAPH_TYPES.VIEW_3D}>3D Surface View</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );

    return (
      <div className="space-y-4">
        {graphTypeSelector}
        
        <div className="bg-slate-800/30 rounded-lg p-4">
          <div ref={plotly3DRef} style={{ width: '100%', height: '600px' }}></div>
        </div>

        {/* 3D View Controls and Info */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Frequency Range</div>
            <div className="text-sm font-semibold text-white">
              {sortedFrequencies[0]?.toFixed(1)} - {sortedFrequencies[sortedFrequencies.length - 1]?.toFixed(1)} MHz
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Time Duration</div>
            <div className="text-sm font-semibold text-white">
              {timeInSeconds[timeInSeconds.length - 1]?.toFixed(1)} seconds
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Level Range</div>
            <div className="text-sm font-semibold text-white">
              {Math.min(...allLevels).toFixed(1)} to {Math.max(...allLevels).toFixed(1)} dBm
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Data Points</div>
            <div className="text-sm font-semibold text-white">
              {sortedFrequencies.length} × {sortedTimestamps.length} = {sortedFrequencies.length * sortedTimestamps.length}
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">3D View Controls</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• <strong>Rotate:</strong> Click and drag</li>
            <li>• <strong>Zoom:</strong> Scroll wheel or pinch</li>
            <li>• <strong>Pan:</strong> Right-click and drag (or Shift + drag)</li>
            <li>• <strong>Reset:</strong> Double-click or use home button</li>
          </ul>
        </div>
      </div>
    );
  };

  // Render 2D Spectrogram (Frequency vs Time with Level as Color)
  const renderSpectrogramView = () => {
    if (!itemData || !itemData.data_points || itemData.data_points.length === 0) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No data available for spectrogram</p>
        </div>
      );
    }

    // Graph Type Selector Panel at the top
    const graphTypeSelector = (
      <div className="flex items-center space-x-3 mb-4">
        <Select value={graphType} onValueChange={setGraphType}>
          <SelectTrigger className="w-64 input-spectrum">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GRAPH_TYPES.LEVEL_VS_TIME}>Level vs Time</SelectItem>
            <SelectItem value={GRAPH_TYPES.LEVEL_VS_FREQUENCY}>Level vs Frequency</SelectItem>
            <SelectItem value={GRAPH_TYPES.SPECTROGRAM_2D}>2D Spectrogram</SelectItem>
            <SelectItem value={GRAPH_TYPES.VIEW_3D}>3D Surface View</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );

    // Calculate min and max levels for color scaling
    const levels = itemData.data_points.map(p => parseFloat(p.level_dbm));
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    const levelRange = maxLevel - minLevel;

    // Color scale function (blue to red through green/yellow)
    const getLevelColor = (level) => {
      const normalized = (level - minLevel) / levelRange;
      
      if (normalized < 0.25) {
        // Blue to Cyan
        const t = normalized / 0.25;
        return `rgb(${Math.floor(0 * t)}, ${Math.floor(0 + 255 * t)}, 255)`;
      } else if (normalized < 0.5) {
        // Cyan to Green
        const t = (normalized - 0.25) / 0.25;
        return `rgb(0, 255, ${Math.floor(255 * (1 - t))})`;
      } else if (normalized < 0.75) {
        // Green to Yellow
        const t = (normalized - 0.5) / 0.25;
        return `rgb(${Math.floor(255 * t)}, 255, 0)`;
      } else {
        // Yellow to Red
        const t = (normalized - 0.75) / 0.25;
        return `rgb(255, ${Math.floor(255 * (1 - t))}, 0)`;
      }
    };

    // Group data by timestamp and frequency for spectrogram
    const spectrogramData = {};
    const uniqueFrequencies = new Set();
    const uniqueTimestamps = new Set();

    itemData.data_points.forEach(point => {
      const freq = parseInt(point.frequency_hz);
      const timestamp = point.timestamp ? new Date(point.timestamp).getTime() : 0;
      const level = parseFloat(point.level_dbm);
      
      uniqueFrequencies.add(freq);
      uniqueTimestamps.add(timestamp);
      
      if (!spectrogramData[timestamp]) {
        spectrogramData[timestamp] = {};
      }
      spectrogramData[timestamp][freq] = level;
    });

    const sortedFrequencies = Array.from(uniqueFrequencies).sort((a, b) => a - b);
    const sortedTimestamps = Array.from(uniqueTimestamps).sort((a, b) => a - b);

    const cellWidth = Math.max(2, Math.floor(1000 / sortedFrequencies.length));
    const cellHeight = Math.max(20, Math.floor(400 / sortedTimestamps.length));

    const spectrogramContent = (
      <div className="space-y-4">
        <div className="bg-slate-800/30 rounded-lg p-4 overflow-x-auto">
          <div className="flex space-x-4">
            {/* Spectrogram Canvas */}
            <div className="flex-1">
              <svg width="1000" height="400" className="border border-slate-700">
                {/* Y-axis labels (Time) */}
                <g>
                  {sortedTimestamps.map((timestamp, tidx) => {
                    if (tidx % Math.ceil(sortedTimestamps.length / 10) === 0) {
                      return (
                        <text
                          key={`time-${tidx}`}
                          x="5"
                          y={tidx * cellHeight + cellHeight / 2}
                          fill="#94a3b8"
                          fontSize="10"
                        >
                          {new Date(timestamp).toLocaleTimeString()}
                        </text>
                      );
                    }
                    return null;
                  })}
                </g>

                {/* Spectrogram cells */}
                {sortedTimestamps.map((timestamp, tidx) => (
                  <g key={`row-${tidx}`}>
                    {sortedFrequencies.map((freq, fidx) => {
                      const level = spectrogramData[timestamp]?.[freq];
                      if (level === undefined) return null;
                      
                      const color = getLevelColor(level);
                      
                      return (
                        <rect
                          key={`cell-${tidx}-${fidx}`}
                          x={100 + fidx * cellWidth}
                          y={tidx * cellHeight}
                          width={cellWidth}
                          height={cellHeight}
                          fill={color}
                          stroke="none"
                        />
                      );
                    })}
                  </g>
                ))}

                {/* X-axis labels (Frequency) */}
                <g>
                  {sortedFrequencies.map((freq, fidx) => {
                    if (fidx % Math.ceil(sortedFrequencies.length / 10) === 0) {
                      return (
                        <text
                          key={`freq-${fidx}`}
                          x={100 + fidx * cellWidth}
                          y="395"
                          fill="#94a3b8"
                          fontSize="10"
                          transform={`rotate(-45, ${100 + fidx * cellWidth}, 395)`}
                        >
                          {(freq / 1000000).toFixed(1)} MHz
                        </text>
                      );
                    }
                    return null;
                  })}
                </g>
              </svg>
            </div>

            {/* Color Scale Legend */}
            <div className="w-16 flex flex-col justify-between">
              <div className="text-xs text-slate-400 text-center mb-2">Level (dBm)</div>
              <svg width="60" height="300">
                <defs>
                  <linearGradient id="colorScale" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(255, 0, 0)" />
                    <stop offset="25%" stopColor="rgb(255, 255, 0)" />
                    <stop offset="50%" stopColor="rgb(0, 255, 0)" />
                    <stop offset="75%" stopColor="rgb(0, 255, 255)" />
                    <stop offset="100%" stopColor="rgb(0, 0, 255)" />
                  </linearGradient>
                </defs>
                <rect x="10" y="0" width="20" height="300" fill="url(#colorScale)" stroke="#fff" strokeWidth="1" />
                <text x="35" y="10" fill="#fff" fontSize="10">{maxLevel.toFixed(1)}</text>
                <text x="35" y="155" fill="#fff" fontSize="10">{((minLevel + maxLevel) / 2).toFixed(1)}</text>
                <text x="35" y="300" fill="#fff" fontSize="10">{minLevel.toFixed(1)}</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Spectrogram Info */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Frequency Range</div>
            <div className="text-sm font-semibold text-white">
              {(sortedFrequencies[0] / 1000000).toFixed(1)} - {(sortedFrequencies[sortedFrequencies.length - 1] / 1000000).toFixed(1)} MHz
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Time Span</div>
            <div className="text-sm font-semibold text-white">
              {sortedTimestamps.length} scans
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Level Range</div>
            <div className="text-sm font-semibold text-white">
              {minLevel.toFixed(1)} to {maxLevel.toFixed(1)} dBm
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="text-xs text-slate-400">Resolution</div>
            <div className="text-sm font-semibold text-white">
              {sortedFrequencies.length} freq × {sortedTimestamps.length} time
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-4">
        {graphTypeSelector}
        {spectrogramContent}
      </div>
    );
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

    // Determine which data to display
    let dataToDisplay = itemData.data_points;
    if (!isSingleScan && scans.length > 0 && selectedScanIndex < scans.length) {
      dataToDisplay = scans[selectedScanIndex].points;
    }

    let chartData = [];
    
    if (graphType === GRAPH_TYPES.LEVEL_VS_TIME) {
      // For Level vs Time, use all data points but filter by selected frequency
      let timeSeriesData = itemData.data_points;
      
      // Filter by selected frequency if one is selected
      if (selectedFrequency) {
        timeSeriesData = itemData.data_points.filter(p => p.frequency_hz === selectedFrequency);
      }
      
      chartData = timeSeriesData.map((point, index) => ({
        index: index + 1,
        time: point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : `Point ${index + 1}`,
        level: parseFloat(point.level_dbm),
        frequency: parseInt(point.frequency_hz) / 1000000,
        timestamp: point.timestamp
      }));
    } else if (graphType === GRAPH_TYPES.LEVEL_VS_FREQUENCY) {
      // For Level vs Frequency, only show the selected scan
      chartData = dataToDisplay.map((point) => ({
        frequency: parseInt(point.frequency_hz) / 1000000,
        level: parseFloat(point.level_dbm),
        timestamp: point.timestamp
      }));
    } else if (graphType === GRAPH_TYPES.SPECTROGRAM_2D) {
      // Prepare spectrogram data - will be rendered separately
      return renderSpectrogramView();
    } else if (graphType === GRAPH_TYPES.VIEW_3D) {
      // Prepare 3D surface plot data
      return render3DView();
    }

    const handleChartClick = (data) => {
      if (data && data.activePayload && data.activePayload.length > 0) {
        const point = data.activePayload[0].payload;
        if (graphType === GRAPH_TYPES.LEVEL_VS_TIME) {
          addMarker({
            time: point.time,
            level: point.level,
            timestamp: point.timestamp
          }, point.index);
        } else {
          const idx = chartData.findIndex(p => p.frequency === point.frequency && p.level === point.level);
          addMarker({
            frequency: point.frequency,
            level: point.level,
            timestamp: point.timestamp
          }, idx);
        }
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Select value={graphType} onValueChange={setGraphType}>
              <SelectTrigger className="w-64 input-spectrum">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GRAPH_TYPES.LEVEL_VS_TIME}>Level vs Time</SelectItem>
                <SelectItem value={GRAPH_TYPES.LEVEL_VS_FREQUENCY}>Level vs Frequency</SelectItem>
                <SelectItem value={GRAPH_TYPES.SPECTROGRAM_2D}>2D Spectrogram</SelectItem>
                <SelectItem value={GRAPH_TYPES.VIEW_3D}>3D Surface View</SelectItem>
              </SelectContent>
            </Select>

            {/* Frequency Selector - only show for Level vs Time */}
            {graphType === GRAPH_TYPES.LEVEL_VS_TIME && availableFrequencies.length > 1 && (
              <Select value={selectedFrequency?.toString()} onValueChange={(val) => setSelectedFrequency(parseInt(val))}>
                <SelectTrigger className="w-64 input-spectrum">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  {availableFrequencies.map((freq) => (
                    <SelectItem key={freq} value={freq.toString()}>
                      {(freq / 1000000).toFixed(3)} MHz
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Scan Selector - only show for Level vs Frequency with multiple scans */}
            {graphType === GRAPH_TYPES.LEVEL_VS_FREQUENCY && !isSingleScan && scans.length > 1 && (
              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-2 border border-blue-500/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedScanIndex(Math.max(0, selectedScanIndex - 1))}
                  disabled={selectedScanIndex === 0}
                  className="h-8"
                >
                  ←
                </Button>
                <span className="text-sm text-white px-2">
                  Scan {scans[selectedScanIndex]?.scanNumber || 1} of {scans.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedScanIndex(Math.min(scans.length - 1, selectedScanIndex + 1))}
                  disabled={selectedScanIndex === scans.length - 1}
                  className="h-8"
                >
                  →
                </Button>
                <span className="text-xs text-slate-400">
                  {new Date(scans[selectedScanIndex]?.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {markers.length < 4 && itemData?.data_points && (
              <Select onValueChange={(value) => addMarkerAtPoint(parseInt(value))}>
                <SelectTrigger className="w-64 input-spectrum">
                  <SelectValue placeholder="Add Marker..." />
                </SelectTrigger>
                <SelectContent>
                  {itemData.data_points.slice(0, 50).map((point, idx) => {
                    const xValue = graphType === GRAPH_TYPES.LEVEL_VS_TIME 
                      ? (point.timestamp ? new Date(point.timestamp).toLocaleTimeString() : `T${idx + 1}`)
                      : `${(parseInt(point.frequency_hz) / 1000000).toFixed(3)} MHz`;
                    const yValue = `${parseFloat(point.level_dbm).toFixed(1)} dBm`;
                    
                    return (
                      <SelectItem key={idx} value={idx.toString()}>
                        {xValue}: {yValue}
                      </SelectItem>
                    );
                  })}
                  {itemData.data_points.length > 50 && (
                    <SelectItem value="-1" disabled>...and {itemData.data_points.length - 50} more points</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
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
                onClick={handleChartClick}
                style={{ cursor: 'crosshair' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                <Legend />
                <Line type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} name="Level (dBm)" />
                {/* Render markers as reference dots */}
                {markers.map((marker, idx) => {
                  const markerPoint = chartData.find(d => d.index === marker.index);
                  if (!markerPoint) return null;
                  return (
                    <ReferenceDot
                      key={marker.id}
                      x={markerPoint.time}
                      y={marker.level}
                      r={8}
                      fill={['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx]}
                      stroke="#fff"
                      strokeWidth={2}
                      label={{
                        value: `M${idx + 1}`,
                        position: 'top',
                        fill: '#fff',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}
                    />
                  );
                })}
              </LineChart>
            ) : (
              <ScatterChart 
                data={chartData}
                onClick={handleChartClick}
                style={{ cursor: 'crosshair' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="frequency" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                <Legend />
                <Scatter dataKey="level" fill="#3b82f6" name="Level (dBm)" />
                {/* Render markers as reference dots */}
                {markers.map((marker, idx) => (
                  <ReferenceDot
                    key={marker.id}
                    x={marker.frequency}
                    y={marker.level}
                    r={8}
                    fill={['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][idx]}
                    stroke="#fff"
                    strokeWidth={2}
                    label={{
                      value: `M${idx + 1}`,
                      position: 'top',
                      fill: '#fff',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                ))}
              </ScatterChart>
            )}
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-2 text-center">Use "Add Marker" dropdown above to place markers on the graph</p>
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
        {dataToDisplay && dataToDisplay.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Data Points {!isSingleScan && `(Scan ${scans[selectedScanIndex]?.scanNumber || 1})`}</div>
              <div className="text-lg font-semibold text-white">{dataToDisplay.length}</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Min Level</div>
              <div className="text-lg font-semibold text-green-300">
                {Math.min(...dataToDisplay.map(p => parseFloat(p.level_dbm))).toFixed(1)} dBm
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Max Level</div>
              <div className="text-lg font-semibold text-red-300">
                {Math.max(...dataToDisplay.map(p => parseFloat(p.level_dbm))).toFixed(1)} dBm
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-400">Avg Level</div>
              <div className="text-lg font-semibold text-blue-300">
                {(dataToDisplay.reduce((sum, p) => sum + parseFloat(p.level_dbm), 0) / dataToDisplay.length).toFixed(1)} dBm
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
