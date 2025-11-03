import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Database,
  Search,
  Filter,
  RefreshCw,
  BarChart3,
  FileText,
  Image,
  Music,
  Calendar,
  User,
  Settings,
  Download,
  Eye,
  Trash2,
  Plus,
  HardDrive,
  Clock,
  Radio
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DATA_TYPES = {
  measurement_result: {
    label: 'Measurement Results',
    icon: BarChart3,
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    description: 'Spectrum measurement data and results'
  },
  frequency_list: {
    label: 'Frequency Lists',
    icon: Radio,
    color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    description: 'Imported frequency list data from SMDI'
  },
  transmitter_list: {
    label: 'Transmitter Lists',
    icon: HardDrive,
    color: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    description: 'Imported transmitter list data from SMDI'
  },
  graph: {
    label: 'Graphs & Charts', 
    icon: Image,
    color: 'bg-green-500/20 text-green-300 border-green-500/30',
    description: 'Visualization charts and spectrum plots'
  },
  audio: {
    label: 'Audio Recordings',
    icon: Music,
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', 
    description: 'Demodulated audio and recordings'
  },
  registry: {
    label: 'Registry Files',
    icon: Calendar,
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    description: 'Measurement logs and registry data'
  },
  user_log: {
    label: 'User Logs',
    icon: User,
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    description: 'User activity and system logs'
  },
  automatic_definition: {
    label: 'Auto Definitions',
    icon: Settings,
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    description: 'Automatic measurement configurations'
  }
};

export default function DataNavigator() {
  const [activeTab, setActiveTab] = useState('measurement_result');
  const [data, setData] = useState({});
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50 });

  useEffect(() => {
    loadStatistics();
    loadDataForType(activeTab);
  }, []);

  useEffect(() => {
    loadDataForType(activeTab);
  }, [activeTab, searchTerm, pagination]);

  const loadStatistics = async () => {
    try {
      const response = await axios.get(`${API}/data/statistics`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Failed to load data statistics');
    }
  };

  const loadDataForType = async (dataType) => {
    try {
      setLoading(true);
      
      // Handle SMDI data types separately
      if (dataType === 'frequency_list') {
        const response = await axios.get(`${API}/smdi/frequency-lists`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setData(prev => ({ ...prev, [dataType]: response.data.frequency_lists }));
      } else if (dataType === 'transmitter_list') {
        const response = await axios.get(`${API}/smdi/transmitter-lists`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setData(prev => ({ ...prev, [dataType]: response.data.transmitter_lists }));
      } else if (dataType === 'automatic_definition') {
        // Handle AMM configurations
        const response = await axios.get(`${API}/amm/configurations`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        // Transform AMM configs to match DataNavigator format
        const configs = response.data.configurations.map(config => ({
          id: config.id,
          name: config.name,
          description: config.description,
          measurement_type: config.measurement_type,
          station_name: config.station_names?.join(', '),
          created_at: config.created_at,
          status: config.status,
          file_size: 0 // AMM configs don't have file size
        }));
        setData(prev => ({ ...prev, [dataType]: { items: configs, total_count: configs.length } }));
      } else {
        // Original data types
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          page_size: pagination.pageSize.toString()
        });
        
        if (searchTerm) {
          params.append('name_search', searchTerm);
        }
        
        const response = await axios.get(`${API}/data/${dataType}?${params}`);
        setData(prev => ({ ...prev, [dataType]: response.data }));
      }
    } catch (error) {
      console.error(`Error loading ${dataType} data:`, error);
      toast.error(`Failed to load ${DATA_TYPES[dataType]?.label || dataType}`);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    try {
      await axios.post(`${API}/data/create-sample`);
      toast.success('Sample data created successfully');
      loadStatistics();
      loadDataForType(activeTab);
    } catch (error) {
      toast.error('Failed to create sample data');
    }
  };

  const deleteItem = async (itemId, dataType) => {
    try {
      // Handle SMDI data types separately
      if (dataType === 'frequency_list') {
        await axios.delete(`${API}/smdi/frequency-lists/${itemId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      } else if (dataType === 'transmitter_list') {
        await axios.delete(`${API}/smdi/transmitter-lists/${itemId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.delete(`${API}/data/${dataType}/${itemId}`);
      }
      toast.success('Item deleted successfully');
      loadDataForType(dataType);
      loadStatistics();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatForType = (type) => {
    return statistics.find(stat => stat.type === type) || 
           { count: 0, total_size: 0, latest_item: null };
  };

  const renderDataTable = (dataType) => {
    const typeData = data[dataType];
    if (!typeData) return <div>Loading...</div>;

    // Handle SMDI data types (they return arrays directly, not {items, total_count})
    let items, total_count;
    if (dataType === 'frequency_list' || dataType === 'transmitter_list') {
      items = typeData;
      total_count = typeData.length;
    } else {
      items = typeData.items || [];
      total_count = typeData.total_count || 0;
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No {DATA_TYPES[dataType].label}</h3>
          <p className="text-slate-400 mb-4">No data found for this category</p>
          <Button onClick={createSampleData} className="btn-spectrum">
            <Plus className="w-4 h-4 mr-2" />
            Create Sample Data
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Data Table Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">
              Showing {items.length} of {total_count} items
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={createSampleData} variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Sample
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Description</th>
                  {dataType === 'frequency_list' && (
                    <>
                      <th className="text-left p-4 font-medium">Order ID</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Frequencies</th>
                    </>
                  )}
                  {dataType === 'transmitter_list' && (
                    <>
                      <th className="text-left p-4 font-medium">Order ID</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Transmitters</th>
                    </>
                  )}
                  {dataType === 'measurement_result' && (
                    <>
                      <th className="text-left p-4 font-medium">Frequency</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Station</th>
                    </>
                  )}
                  {dataType === 'graph' && (
                    <>
                      <th className="text-left p-4 font-medium">Graph Type</th>
                      <th className="text-left p-4 font-medium">Dimensions</th>
                    </>
                  )}
                  {dataType === 'audio' && (
                    <>
                      <th className="text-left p-4 font-medium">Duration</th>
                      <th className="text-left p-4 font-medium">Sample Rate</th>
                      <th className="text-left p-4 font-medium">Frequency</th>
                    </>
                  )}
                  {dataType === 'automatic_definition' && (
                    <>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Station</th>
                      <th className="text-left p-4 font-medium">Status</th>
                    </>
                  )}
                  <th className="text-left p-4 font-medium">Size</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-700/30 hover:bg-slate-700/20">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          item.status === 'completed' || item.status === 'Finished' ? 'bg-green-400' : 
                          item.status === 'failed' ? 'bg-red-400' : 
                          'bg-yellow-400'
                        }`}></div>
                        <div>
                          <div className="font-medium text-white">
                            {item.name || item.order_id || item.id}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.file_format?.toUpperCase() || (item.result_type || 'XML')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 max-w-xs truncate">
                      {item.description || item.query_name || 
                       (dataType === 'measurement_result' && item.data_points ? 
                        `${item.data_points} measurement points` : 'No description')}
                    </td>
                    
                    {/* Frequency List specific columns */}
                    {dataType === 'frequency_list' && (
                      <>
                        <td className="p-4 text-slate-300">
                          <code className="text-xs bg-slate-800 px-2 py-1 rounded">{item.order_id}</code>
                        </td>
                        <td className="p-4">
                          <Badge className={`${
                            item.status === 'Finished' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }`}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-300">
                          {item.frequencies ? item.frequencies.length : 0} frequencies
                        </td>
                      </>
                    )}
                    
                    {/* Transmitter List specific columns */}
                    {dataType === 'transmitter_list' && (
                      <>
                        <td className="p-4 text-slate-300">
                          <code className="text-xs bg-slate-800 px-2 py-1 rounded">{item.order_id}</code>
                        </td>
                        <td className="p-4">
                          <Badge className={`${
                            item.status === 'Finished' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }`}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-300">
                          {item.transmitters ? item.transmitters.length : 0} transmitters
                        </td>
                      </>
                    )}
                    
                    {/* Measurement Result specific columns */}
                    {dataType === 'measurement_result' && (
                      <>
                        <td className="p-4 text-slate-300">
                          {item.frequency_single ? `${(item.frequency_single / 1000000).toFixed(1)} MHz` : 
                           item.frequency ? `${(item.frequency / 1000000).toFixed(1)} MHz` : 
                           item.frequency_range_low ? 
                           `${(item.frequency_range_low / 1000000).toFixed(0)}-${(item.frequency_range_high / 1000000).toFixed(0)} MHz` :
                           'N/A'}
                        </td>
                        <td className="p-4">
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                            {item.measurement_type}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-300">{item.station_name || 'N/A'}</td>
                      </>
                    )}
                    
                    {/* Graph specific columns */}
                    {dataType === 'graph' && (
                      <>
                        <td className="p-4 text-slate-300">{item.graph_type || 'N/A'}</td>
                        <td className="p-4 text-slate-300">
                          {item.width && item.height ? `${item.width}x${item.height}` : 'N/A'}
                        </td>
                      </>
                    )}
                    
                    {/* Audio specific columns */}
                    {dataType === 'audio' && (
                      <>
                        <td className="p-4 text-slate-300">
                          {item.duration ? `${item.duration.toFixed(1)}s` : 'N/A'}
                        </td>
                        <td className="p-4 text-slate-300">
                          {item.sample_rate ? `${item.sample_rate} Hz` : 'N/A'}
                        </td>
                        <td className="p-4 text-slate-300">
                          {item.frequency ? `${(item.frequency / 1000000).toFixed(1)} MHz` : 'N/A'}
                        </td>
                      </>
                    )}
                    
                    {/* Automatic Definition specific columns */}
                    {dataType === 'automatic_definition' && (
                      <>
                        <td className="p-4">
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                            {item.measurement_type || 'N/A'}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-300">{item.station_name || 'N/A'}</td>
                        <td className="p-4">
                          <Badge className={`${
                            item.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            item.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            'bg-slate-500/20 text-slate-300 border-slate-500/30'
                          }`}>
                            {item.status || 'draft'}
                          </Badge>
                        </td>
                      </>
                    )}
                    
                    <td className="p-4 text-slate-300">{formatFileSize(item.file_size)}</td>
                    <td className="p-4 text-slate-400 text-xs">
                      {formatDate(item.created_at || item.measurement_start)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteItem(
                            (dataType === 'frequency_list' || dataType === 'transmitter_list') ? item.order_id : item.id, 
                            dataType
                          )}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Data Navigator</h1>
          <p className="text-slate-400">Browse and manage all spectrum monitoring data</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => loadDataForType(activeTab)} className="btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {Object.entries(DATA_TYPES).map(([key, typeInfo]) => {
          const stat = getStatForType(key);
          const Icon = typeInfo.icon;
          
          return (
            <Card key={key} className={`glass-card border-0 interactive-hover cursor-pointer ${
              activeTab === key ? 'ring-2 ring-blue-400/50' : ''
            }`} onClick={() => setActiveTab(key)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <Badge className={typeInfo.color}>
                    {stat.count}
                  </Badge>
                </div>
                <h3 className="font-medium text-white text-sm">{typeInfo.label}</h3>
                <p className="text-xs text-slate-400 mt-1">{formatFileSize(stat.total_size)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search data items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-spectrum pl-10"
              />
            </div>
            <Button variant="secondary" className="btn-secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          {Object.entries(DATA_TYPES).map(([key, typeInfo]) => {
            const stat = getStatForType(key);
            return (
              <TabsTrigger key={key} value={key} className="flex flex-col items-center space-y-1">
                {React.createElement(typeInfo.icon, { className: "w-4 h-4" })}
                <span className="text-xs">{typeInfo.label}</span>
                <span className="text-xs text-slate-400">({stat.count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(DATA_TYPES).map((dataType) => (
          <TabsContent key={dataType} value={dataType}>
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  {React.createElement(DATA_TYPES[dataType].icon, { className: "w-5 h-5 mr-2" })}
                  {DATA_TYPES[dataType].label}
                </CardTitle>
                <CardDescription>{DATA_TYPES[dataType].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="spinner mr-2"></div>
                    <span>Loading data...</span>
                  </div>
                ) : (
                  renderDataTable(dataType)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
