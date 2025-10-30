import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  Calendar,
  Radio,
  Activity
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import MeasurementViewer from './MeasurementViewer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function DataNavigatorEnhanced() {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);

  useEffect(() => {
    loadMeasurements();
  }, [page, filterStation, filterType, filterDateStart, filterDateEnd]);

  const loadMeasurements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('skip', (page - 1) * limit);
      params.append('limit', limit);
      
      if (filterStation) params.append('station_name', filterStation);
      if (filterType) params.append('measurement_type', filterType);
      if (filterDateStart) params.append('start_date', filterDateStart);
      if (filterDateEnd) params.append('end_date', filterDateEnd);
      
      const response = await axios.get(`${API}/measurement-results?${params}`);
      if (response.data.success) {
        setMeasurements(response.data.data.results);
        setTotal(response.data.data.total);
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
      toast.error('Failed to load measurements');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMeasurement = (measurement) => {
    setSelectedMeasurement(measurement);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedMeasurement(null);
  };

  const handleDeleteMeasurement = async (measurementId) => {
    if (!window.confirm('Are you sure you want to delete this measurement?')) return;
    
    try {
      await axios.delete(`${API}/measurement-results/${measurementId}`);
      toast.success('Measurement deleted');
      loadMeasurements();
    } catch (error) {
      console.error('Error deleting measurement:', error);
      toast.error('Failed to delete measurement');
    }
  };

  const filteredMeasurements = measurements.filter(m => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        m.order_id?.toLowerCase().includes(search) ||
        m.station_name?.toLowerCase().includes(search) ||
        m.signal_path?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(total / limit);

  if (viewMode === 'detail' && selectedMeasurement) {
    return (
      <div className="p-8">
        <MeasurementViewer 
          measurementId={selectedMeasurement.id} 
          onClose={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Data Navigator
          </h1>
          <p className="text-slate-400">
            Browse and analyze measurement results from Argus
          </p>
        </div>
        <Button 
          onClick={loadMeasurements}
          disabled={loading}
          className="btn-spectrum"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search order ID, station..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-spectrum"
              />
            </div>

            {/* Station Filter */}
            <Input
              placeholder="Filter by station"
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="input-spectrum"
            />

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-spectrum"
            >
              <option value="">All Types</option>
              <option value="FFM">FFM</option>
              <option value="SCAN">SCAN</option>
              <option value="DSCAN">DSCAN</option>
              <option value="PSCAN">PSCAN</option>
            </select>

            {/* Date Range */}
            <Input
              type="date"
              placeholder="Start Date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="input-spectrum"
            />

            <Input
              type="date"
              placeholder="End Date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="input-spectrum"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Total Results</p>
                <p className="text-2xl font-bold text-white">{total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Filtered</p>
                <p className="text-2xl font-bold text-white">{filteredMeasurements.length}</p>
              </div>
              <Filter className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Current Page</p>
                <p className="text-2xl font-bold text-white">{page} / {totalPages}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Stations</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(measurements.map(m => m.station_name)).size}
                </p>
              </div>
              <Radio className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Measurements Table */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>Measurement Results</CardTitle>
          <CardDescription>
            {filteredMeasurements.length} measurement{filteredMeasurements.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading measurements...
            </div>
          ) : filteredMeasurements.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No measurements found</p>
              <p className="text-sm mt-2">Try adjusting your filters or create a new AMM configuration</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-slate-300 font-medium">Order ID</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Station</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Signal Path</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Type</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Frequency</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Start Time</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Data Points</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Status</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeasurements.map((measurement) => (
                    <tr 
                      key={measurement.id} 
                      className="border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 text-white font-mono text-xs">{measurement.order_id}</td>
                      <td className="p-3 text-slate-300">{measurement.station_name}</td>
                      <td className="p-3 text-slate-400 text-xs">{measurement.signal_path}</td>
                      <td className="p-3">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          {measurement.measurement_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {measurement.frequency_single 
                          ? `${(measurement.frequency_single / 1000000).toFixed(2)} MHz`
                          : measurement.frequency_range_low && measurement.frequency_range_high
                          ? `${(measurement.frequency_range_low / 1000000).toFixed(1)}-${(measurement.frequency_range_high / 1000000).toFixed(1)} MHz`
                          : 'N/A'
                        }
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {new Date(measurement.measurement_start).toLocaleString()}
                      </td>
                      <td className="p-3 text-white text-center">{measurement.data_points}</td>
                      <td className="p-3">
                        <Badge className={`text-xs ${
                          measurement.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          measurement.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        }`}>
                          {measurement.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleViewMeasurement(measurement)}
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {measurement.csv_file_path && (
                            <Button
                              onClick={async () => {
                                try {
                                  const response = await axios.get(
                                    `${API}/measurement-results/${measurement.id}/csv`,
                                    { responseType: 'blob' }
                                  );
                                  const url = window.URL.createObjectURL(new Blob([response.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', `${measurement.order_id}_data.csv`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                  toast.success('CSV downloaded');
                                } catch (error) {
                                  toast.error('Download failed');
                                }
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            size="sm"
            variant="ghost"
          >
            Previous
          </Button>
          <span className="text-slate-400 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            size="sm"
            variant="ghost"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default DataNavigatorEnhanced;
