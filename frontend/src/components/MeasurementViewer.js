import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  Download, 
  Table, 
  FileText,
  Activity,
  Radio,
  Calendar,
  MapPin,
  Zap,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function MeasurementViewer({ measurementId, onClose }) {
  const [measurement, setMeasurement] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [xmlContent, setXmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('graph');

  useEffect(() => {
    if (measurementId) {
      loadMeasurement();
    }
  }, [measurementId]);

  const loadMeasurement = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/measurement-results/${measurementId}`);
      if (response.data.success) {
        setMeasurement(response.data.data.metadata);
        setCsvData(response.data.data.csv_data || []);
        setXmlContent(response.data.data.xml_content || '');
      }
    } catch (error) {
      console.error('Error loading measurement:', error);
      toast.error('Failed to load measurement details');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await axios.get(`${API}/measurement-results/${measurementId}/csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${measurement.order_id}_data.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-400">Loading measurement...</div>
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-400">Measurement not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onClose} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white">{measurement.order_id}</h2>
            <p className="text-sm text-slate-400">{measurement.station_name} - {measurement.signal_path}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={`${
            measurement.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
            measurement.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
            'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
          }`}>
            {measurement.status}
          </Badge>
          {csvData.length > 0 && (
            <Button onClick={downloadCSV} size="sm" className="btn-spectrum">
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-slate-400">Measurement Type</p>
            </div>
            <p className="text-lg font-semibold text-white">{measurement.measurement_type}</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Radio className="w-4 h-4 text-green-400" />
              <p className="text-xs text-slate-400">Frequency</p>
            </div>
            <p className="text-lg font-semibold text-white">
              {measurement.frequency_single 
                ? `${(measurement.frequency_single / 1000000).toFixed(2)} MHz`
                : measurement.frequency_range_low && measurement.frequency_range_high
                ? `${(measurement.frequency_range_low / 1000000).toFixed(1)}-${(measurement.frequency_range_high / 1000000).toFixed(1)} MHz`
                : 'N/A'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-slate-400">Start Time</p>
            </div>
            <p className="text-sm font-semibold text-white">
              {new Date(measurement.measurement_start).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Table className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-slate-400">Data Points</p>
            </div>
            <p className="text-lg font-semibold text-white">{measurement.data_points}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="glass-card border-0">
          <TabsTrigger value="graph">📊 Graph</TabsTrigger>
          <TabsTrigger value="data">📋 Data Table</TabsTrigger>
          <TabsTrigger value="xml">📄 Raw XML</TabsTrigger>
          <TabsTrigger value="details">ℹ️ Details</TabsTrigger>
        </TabsList>

        <TabsContent value="graph">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Level vs Time Graph
              </CardTitle>
              <CardDescription>
                Visualization of measurement data over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {csvData.length > 0 && csvData[0].level_dbm ? (
                <div className="w-full h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={csvData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ value: 'Level (dBm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Line 
                        type="monotone" 
                        dataKey="level_dbm" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        name="Level (dBm)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No graphable data available</p>
                  <p className="text-sm mt-2">Measurement data must contain level_dbm and timestamp fields</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Measurement Data ({csvData.length} rows)</CardTitle>
              <CardDescription>
                Extracted measurement values in CSV format
              </CardDescription>
            </CardHeader>
            <CardContent>
              {csvData.length > 0 ? (
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/50 sticky top-0">
                      <tr>
                        {Object.keys(csvData[0]).map(key => (
                          <th key={key} className="text-left p-3 text-slate-300 font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-700/30 hover:bg-slate-800/30">
                          {Object.values(row).map((value, vidx) => (
                            <td key={vidx} className="p-3 text-slate-400">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No CSV data available for this measurement
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xml">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Raw XML Content</CardTitle>
              <CardDescription>
                Original Argus response XML
              </CardDescription>
            </CardHeader>
            <CardContent>
              {xmlContent ? (
                <pre className="bg-slate-900/50 p-4 rounded-lg overflow-auto max-h-96 text-xs text-slate-300">
                  {xmlContent}
                </pre>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  XML content not available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Measurement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Order ID</p>
                  <p className="text-white font-mono">{measurement.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Result Type</p>
                  <p className="text-white">{measurement.result_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Station Name</p>
                  <p className="text-white">{measurement.station_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Station PC</p>
                  <p className="text-white">{measurement.station_pc}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Signal Path</p>
                  <p className="text-white">{measurement.signal_path}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Operator</p>
                  <p className="text-white">{measurement.operator_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">File Size</p>
                  <p className="text-white">{(measurement.file_size / 1024).toFixed(2)} KB</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Created At</p>
                  <p className="text-white">{new Date(measurement.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-slate-700/30 pt-4">
                <p className="text-sm text-slate-400 mb-2">File Paths</p>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">XML:</span>
                    <span className="text-slate-400 ml-2 font-mono">{measurement.xml_file_path}</span>
                  </div>
                  {measurement.csv_file_path && (
                    <div>
                      <span className="text-slate-500">CSV:</span>
                      <span className="text-slate-400 ml-2 font-mono">{measurement.csv_file_path}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MeasurementViewer;
