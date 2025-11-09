import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import AMMCalendarView from './AMMCalendarView';
import LocationMeasurementWizard from './LocationMeasurementWizard';
import { 
  Clock,
  Play,
  Square,
  Pause,
  Settings,
  Calendar,
  Radio,
  BarChart3,
  Bell,
  Plus,
  Edit,
  Trash2,
  Activity,
  Timer,
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SCHEDULE_TYPES = {
  always: { label: 'Siempre (Always)', icon: Activity, description: 'Continuous measurement' },
  span: { label: 'Span (Time Span)', icon: Calendar, description: 'Between start and end dates/times' },
  periodic: { label: 'Periódico (Periodic)', icon: Timer, description: 'Recurring on specific days and times' }
};

const MEASUREMENT_TYPES = {
  FFM: { label: 'Fixed Frequency Mode', description: 'Single frequency measurement' },
  SCAN: { label: 'Frequency Scan', description: 'Scan across frequency range' },
  PSCAN: { label: 'P-Scan (Panoramic)', description: 'Panoramic scan with spectrum display' },
  DSCAN: { label: 'D-Scan', description: 'Direction finding scan' },
  FLSCAN: { label: 'Frequency List Scan', description: 'Scan predefined frequencies' },
  LOCATION: { label: 'Location Measurement', description: 'Direction finding and location' },
  COVERAGE: { label: 'Coverage Measurement', description: 'Coverage area analysis' }
};

const RESULT_TYPES = {
  MR: { label: 'Measurement Result', description: 'Standard measurement results with all data points' },
  CMR: { label: 'Compress Measurement Result', description: 'Compressed measurement data to save storage' },
  MaxHold: { label: 'MaxHold', description: 'Maximum values during measurement period' },
  AMR: { label: 'Measurement Result during Alarm', description: 'Results captured during alarm conditions' },
  LOG: { label: 'Start/End of Alarm', description: 'Alarm event log data' },
  TXT: { label: 'Text', description: 'Text format measurement data' },
  ADC: { label: 'ADC Stream', description: 'Raw ADC data stream' }
};

const AMM_STATUS_COLORS = {
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  stopped: 'bg-red-500/20 text-red-300 border-red-500/30',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  error: 'bg-red-500/20 text-red-300 border-red-500/30'
};

export default function AutomaticMode() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ammConfigs, setAmmConfigs] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // AMM Wizard State
  const [wizardStep, setWizardStep] = useState(0); // Start at 0 for measurement category selection
  const [measurementCategory, setMeasurementCategory] = useState(null); // 'location' or 'other'
  const [availableStations, setAvailableStations] = useState([]);
  const [availableMeasurementTypes, setAvailableMeasurementTypes] = useState([]);
  const [selectedSignalPath, setSelectedSignalPath] = useState(null);
  const [systemParameters, setSystemParameters] = useState(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [signalPaths, setSignalPaths] = useState([]);
  const [loadingSignalPaths, setLoadingSignalPaths] = useState(false);
  const [wizardData, setWizardData] = useState({
    // Station Selection (Step 1)
    selected_station: null,
    
    // Basic Info
    name: '',
    description: '',
    
    // Timing Configuration
    timing: {
      schedule_type: 'always', // always, span, periodic
      
      // For span and periodic
      start_date: new Date().toISOString().split('T')[0],
      start_time: '00:00:00',
      end_date: new Date().toISOString().split('T')[0],
      end_time: '23:59:59',
      
      // For periodic only
      weekdays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      },
      all_days: false,
      interval_days: 1,
      daily_start_time: '00:00:00',
      daily_end_time: '23:59:59',
      
      // Fragmentation
      fragmentation_enabled: false,
      fragmentation_interval: '00:00:00',
      fragmentation_duration: '00:00:00',
      fragmentation_count: 1,
      
      continue_after_restart: true
    },
    
    // Measurement Definition
    measurement: {
      measurement_type: 'FFM',
      device_name: 'HE500-PR100-1',
      station_names: ['Station_001'],
      frequency_mode: 'S',
      frequency_single: 100000000,
      frequency_range_start: 88000000,
      frequency_range_end: 108000000,
      frequency_step: 100000,
      receiver_config: {
        if_bandwidth: 9000,
        rf_attenuation: 'Auto',
        demodulation: 'FM',
        detector: 'Average',
        measurement_time: 5
      },
      antenna_config: {
        antenna_path: 'ANT1',
        azimuth: 0
      },
      measured_parameters: ['Level'],
      alarm_configs: [],
      result_type: 'MR'  // Default: Measurement Result
    },
    
    // Range Definition
    range: {
      system_path: 'PATH1',
      frequency_start: 30000000,
      frequency_end: 3000000000
    },
    
    // General Definition
    general: {
      result_config: {
        graphic_type: 'yt_plot',
        save_measurement_results: true,
        save_to_database: true
      }
    }
  });

  useEffect(() => {
    loadData();
    loadSystemParameters();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load available stations when wizard tab is opened
  useEffect(() => {
    if (activeTab === 'wizard' && wizardStep === 1) {
      loadAvailableStations();
    }
  }, [activeTab, wizardStep]);

  const loadSystemParameters = async () => {
    try {
      const response = await axios.get(`${API}/system/parameters`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('argus_token')}` }
      });
      setSystemParameters(response.data);
    } catch (error) {
      console.error('Error loading system parameters:', error);
    }
  };

  const updateAvailableMeasurementTypes = (stationName) => {
    if (!systemParameters || !systemParameters.signal_paths) {
      // If no GSP data, show all measurement types
      setAvailableMeasurementTypes(Object.keys(MEASUREMENT_TYPES));
      return;
    }
    
    // Find signal paths for the selected station
    const stationPaths = systemParameters.signal_paths.filter(
      path => path.station === stationName
    );
    
    // Extract all unique measurement types from all devices in all paths
    const measurementTypes = new Set();
    stationPaths.forEach(path => {
      path.devices.forEach(device => {
        if (device.measurement_params) {
          device.measurement_params.forEach(param => measurementTypes.add(param));
        }
      });
    });
    
    // If no measurement types found, show all
    const typesArray = Array.from(measurementTypes);
    setAvailableMeasurementTypes(typesArray.length > 0 ? typesArray : Object.keys(MEASUREMENT_TYPES));
  };

  // Load signal paths when reaching step 4
  useEffect(() => {
    if (wizardStep === 4 && wizardData.selected_station) {
      loadSignalPaths(wizardData.selected_station.name);
    }
  }, [wizardStep, wizardData.selected_station]);

  const loadAvailableStations = async () => {
    setLoadingStations(true);
    try {
      const response = await axios.get(`${API}/system/available-stations`);
      if (response.data.success) {
        setAvailableStations(response.data.data.stations);
      }
    } catch (error) {
      console.error('Error loading available stations:', error);
      toast.error('Failed to load available stations');
    } finally {
      setLoadingStations(false);
    }
  };

  const loadSignalPaths = async (stationName = null) => {
    setLoadingSignalPaths(true);
    try {
      const url = stationName 
        ? `${API}/system/signal-paths?station_name=${encodeURIComponent(stationName)}`
        : `${API}/system/signal-paths`;
      
      const response = await axios.get(url);
      if (response.data.success) {
        const paths = response.data.data.signal_paths || [];
        setSignalPaths(paths);
        
        if (paths.length === 0) {
          toast.info('No signal paths found. Please request GSP from Configuration page first.', {
            duration: 5000
          });
        } else {
          toast.success(`Loaded ${paths.length} signal paths`);
        }
      }
    } catch (error) {
      console.error('Error loading signal paths:', error);
      toast.error('Failed to load signal paths');
      setSignalPaths([]);
    } finally {
      setLoadingSignalPaths(false);
    }
  };

  const loadData = async () => {
    try {
      const [configsResponse, statsResponse, executionsResponse] = await Promise.all([
        axios.get(`${API}/amm/configurations`),
        axios.get(`${API}/amm/dashboard-stats`),
        axios.get(`${API}/amm/executions?limit=20`)
      ]);
      
      setAmmConfigs(configsResponse.data);
      setDashboardStats(statsResponse.data);
      setExecutions(executionsResponse.data);
    } catch (error) {
      console.error('Error loading AMM data:', error);
      // Set mock data for demonstration
      setAmmConfigs([
        {
          id: '1',
          name: 'Hourly VHF Monitor',
          description: 'Monitor VHF band every hour',
          status: 'active',
          execution_count: 245,
          last_execution: new Date(Date.now() - 3600000).toISOString(),
          next_execution: new Date(Date.now() + 1200000).toISOString()
        }
      ]);
      setDashboardStats({
        total_amm_configs: 3,
        active_amm_configs: 2,
        running_executions: 1,
        executions_last_24h: 48,
        alarms_last_24h: 5,
        success_rate_24h: 98.5
      });
      setExecutions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAMM = async (configId) => {
    try {
      await axios.post(`${API}/amm/configurations/${configId}/start`);
      toast.success('AMM started successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to start AMM');
    }
  };

  const handleStopAMM = async (configId) => {
    try {
      await axios.post(`${API}/amm/configurations/${configId}/stop`);
      toast.success('AMM stopped successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to stop AMM');
    }
  };

  // Transform wizardData to backend format
  const transformWizardDataToBackend = (data) => {
    // Helper function to convert weekdays object to list of integers
    const getWeekdayIndices = (weekdaysObj) => {
      const dayMap = {
        monday: 0,
        tuesday: 1,
        wednesday: 2,
        thursday: 3,
        friday: 4,
        saturday: 5,
        sunday: 6
      };
      return Object.entries(weekdaysObj)
        .filter(([_, enabled]) => enabled)
        .map(([day]) => dayMap[day]);
    };

    // Create timing definition - match backend model exactly
    const timingDefinition = {
      id: crypto.randomUUID ? crypto.randomUUID() : `timing-${Date.now()}`,
      name: `${data.name || 'AMM'} Timing`,
      schedule_type: data.timing.schedule_type,
      
      // Span scheduling - send as datetime strings (ISO format)
      start_date: data.timing.start_date ? `${data.timing.start_date}T00:00:00` : null,
      end_date: data.timing.end_date ? `${data.timing.end_date}T23:59:59` : null,
      
      // Daily/Periodic scheduling - send as time strings (HH:MM:SS format)
      start_time: data.timing.start_time || null,
      end_time: data.timing.end_time || null,
      
      // Weekdays - send as list of integers (0=Monday, 6=Sunday)
      weekdays: getWeekdayIndices(data.timing.weekdays),
      
      // Interval scheduling
      interval_minutes: null,
      interval_hours: null,
      interval_days: data.timing.interval_days || null,
      
      // Fragmentation
      fragmentation_enabled: data.timing.fragmentation_enabled || false,
      fragment_duration_minutes: null,
      fragment_interval_minutes: null,
      
      // Advanced options
      continue_after_restart: data.timing.continue_after_restart !== false,
      
      created_at: new Date().toISOString(),
      created_by: null
    };

    // Create measurement definition
    const measurementDefinition = {
      id: crypto.randomUUID ? crypto.randomUUID() : `measurement-${Date.now()}`,
      name: data.name || 'AMM Measurement',
      measurement_type: data.measurement.measurement_type,
      signal_path: data.measurement.signal_path || data.measurement.device_name, // Prioritize signal_path
      device_name: data.measurement.device_name, // Keep for backwards compatibility
      station_names: data.selected_station ? [data.selected_station.pc] : data.measurement.station_names,
      frequency_mode: data.measurement.frequency_mode,
      frequency_single: data.measurement.frequency_single || null,
      frequency_range_start: data.measurement.frequency_range_start || null,
      frequency_range_end: data.measurement.frequency_range_end || null,
      frequency_step: data.measurement.frequency_step || null,
      frequency_list: data.measurement.frequency_list || [],
      receiver_config: {
        if_bandwidth: data.measurement.receiver_config?.if_bandwidth || 9000,
        rf_attenuation: data.measurement.receiver_config?.rf_attenuation || 'Auto',
        demodulation: data.measurement.receiver_config?.demodulation || null,
        detector: data.measurement.receiver_config?.detector || 'Average',
        measurement_time: data.measurement.receiver_config?.measurement_time || 5
      },
      antenna_config: {
        antenna_path: data.measurement.antenna_config?.antenna_path || 'ANT1',
        azimuth: data.measurement.antenna_config?.azimuth || 0,
        elevation: data.measurement.antenna_config?.elevation || 0,
        polarization: data.measurement.antenna_config?.polarization || 'V'
      },
      measured_parameters: data.measurement.measured_parameters || ['Level'],
      alarm_configs: data.measurement.alarm_configs || [],
      created_at: new Date().toISOString(),
      created_by: null
    };

    // Create range definition
    const rangeDefinition = {
      id: crypto.randomUUID ? crypto.randomUUID() : `range-${Date.now()}`,
      name: `${data.name || 'AMM'} Range`,
      system_path: data.range?.system_path || 'DEFAULT',
      frequency_start: data.range?.frequency_start || 30000000,
      frequency_end: data.range?.frequency_end || 3000000000,
      created_at: new Date().toISOString(),
      created_by: null
    };

    // Create general definition
    const generalDefinition = {
      id: crypto.randomUUID ? crypto.randomUUID() : `general-${Date.now()}`,
      name: `${data.name || 'AMM'} General`,
      result_config: {
        graphic_type: data.general?.result_config?.graphic_type || 'yt_plot',
        save_measurement_results: data.general?.result_config?.save_measurement_results !== false,
        save_to_database: data.general?.result_config?.save_to_database !== false
      },
      created_at: new Date().toISOString(),
      created_by: null
    };

    // Return the properly formatted data
    return {
      name: data.name || 'Unnamed AMM Configuration',
      description: data.description || '',
      timing_definition: timingDefinition,
      measurement_definition: measurementDefinition,
      range_definition: rangeDefinition,
      general_definition: generalDefinition
    };
  };

  const handleCreateAMM = async () => {
    try {
      // Transform wizard data to backend format
      const backendData = transformWizardDataToBackend(wizardData);
      
      console.log('Sending AMM data:', backendData);
      
      const response = await axios.post(`${API}/amm/configurations`, backendData);
      
      toast.success('AMM configuration created successfully');
      setActiveTab('dashboard');
      setWizardStep(1);
      
      // Reset wizard data
      setWizardData({
        selected_station: null,
        name: '',
        description: '',
        timing: {
          schedule_type: 'always',
          start_date: new Date().toISOString().split('T')[0],
          start_time: '00:00:00',
          end_date: new Date().toISOString().split('T')[0],
          end_time: '23:59:59',
          weekdays: {
            monday: true, tuesday: true, wednesday: true,
            thursday: true, friday: true, saturday: false, sunday: false
          },
          all_days: false,
          interval_days: 1,
          daily_start_time: '00:00:00',
          daily_end_time: '23:59:59',
          fragmentation_enabled: false,
          fragmentation_interval: '00:00:00',
          fragmentation_duration: '00:00:00',
          fragmentation_count: 1,
          continue_after_restart: true
        },
        measurement: {
          measurement_type: 'FFM',
          device_name: 'HE500-PR100-1',
          signal_path: 'ADD197+075-EB500 DF', // Signal/System path for ORM
          station_names: ['Station_001'],
          frequency_mode: 'S',
          frequency_single: 100000000,
          receiver_config: {
            if_bandwidth: 9000,
            rf_attenuation: 'Auto',
            demodulation: 'FM',
            detector: 'Average',
            measurement_time: 5
          },
          antenna_config: {
            antenna_path: 'ANT1',
            azimuth: 0
          },
          measured_parameters: ['Level'],
          alarm_configs: []
        },
        range: {
          system_path: 'PATH1',
          frequency_start: 30000000,
          frequency_end: 3000000000
        },
        general: {
          result_config: {
            graphic_type: 'yt_plot',
            save_measurement_results: true,
            save_to_database: true
          }
        }
      });
      
      loadData();
    } catch (error) {
      console.error('AMM creation error:', error);
      
      // Show detailed error message
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          // Validation errors
          const errors = detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
          toast.error(`Validation error: ${errors}`);
        } else {
          toast.error(`Error: ${detail}`);
        }
      } else {
        toast.error('Failed to create AMM configuration');
      }
    }
  };

  const renderDashboard = () => {
    if (!dashboardStats) return <div>Loading...</div>;

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Total AMM Configs</p>
                  <p className="text-3xl font-bold text-white">{dashboardStats.total_amm_configs}</p>
                </div>
                <Settings className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {dashboardStats.active_amm_configs} active
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Running Executions</p>
                  <p className="text-3xl font-bold text-green-400">{dashboardStats.running_executions}</p>
                </div>
                <Activity className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {dashboardStats.executions_last_24h} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">Success Rate</p>
                  <p className="text-3xl font-bold text-cyan-400">{dashboardStats.success_rate_24h}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {dashboardStats.alarms_last_24h} alarms triggered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active AMM Configurations */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center">
              <Radio className="w-5 h-5 mr-2" />
              Active AMM Configurations
            </CardTitle>
            <CardDescription>Automatic measurement configurations and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ammConfigs.length > 0 ? ammConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-white">{config.name}</h4>
                      <Badge className={AMM_STATUS_COLORS[config.status] || AMM_STATUS_COLORS.draft}>
                        {config.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{config.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>Executions: {config.execution_count}</span>
                      {config.last_execution && (
                        <span>Last: {new Date(config.last_execution).toLocaleString()}</span>
                      )}
                      {config.next_execution && (
                        <span>Next: {new Date(config.next_execution).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {config.status === 'active' ? (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleStopAMM(config.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Square className="w-4 h-4 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartAMM(config.id)}
                        className="btn-spectrum"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <Radio className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No AMM Configurations</h3>
                  <p className="text-slate-400 mb-4">Create your first automatic measurement configuration</p>
                  <Button onClick={() => setActiveTab('wizard')} className="btn-spectrum">
                    <Plus className="w-4 h-4 mr-2" />
                    Create AMM Configuration
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        // NEW STEP 1: Station Selection
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <Radio className="w-5 h-5 mr-2" />
                Step 1: Select Monitoring Station
              </CardTitle>
              <CardDescription>Choose an online station with available devices for measurements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingStations ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                  <p className="text-slate-400 mt-3">Loading available stations...</p>
                </div>
              ) : availableStations.length === 0 ? (
                <div className="text-center py-8">
                  <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-3">No online stations available</p>
                  <Button onClick={loadAvailableStations} variant="outline" className="btn-spectrum">
                    Refresh Stations
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {availableStations.map((station, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setWizardData(prev => ({ ...prev, selected_station: station }));
                        updateAvailableMeasurementTypes(station.name);
                      }}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        wizardData.selected_station?.name === station.name
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <h4 className="font-medium text-white text-lg">{station.name}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {station.pc} • {station.device_count} devices
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {station.available_measurement_types.map((type) => (
                              <Badge key={type} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          wizardData.selected_station?.name === station.name
                            ? 'border-cyan-500 bg-cyan-500'
                            : 'border-slate-600'
                        }`}>
                          {wizardData.selected_station?.name === station.name && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between pt-4">
                <Button onClick={loadAvailableStations} variant="outline" disabled={loadingStations}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingStations ? 'animate-spin' : ''}`} />
                  Refresh Stations
                </Button>
                <Button 
                  onClick={() => setWizardStep(2)} 
                  disabled={!wizardData.selected_station}
                  className="btn-spectrum"
                >
                  Next: Basic Information
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        // MOVED TO STEP 2: Basic Information
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Step 2: Basic Information</CardTitle>
              <CardDescription>
                Define the basic details for your AMM configuration on {wizardData.selected_station?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amm_name">AMM Configuration Name</Label>
                <Input
                  id="amm_name"
                  placeholder="e.g., Hourly VHF Monitor"
                  value={wizardData.name}
                  onChange={(e) => setWizardData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-spectrum"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amm_description">Description</Label>
                <Textarea
                  id="amm_description"
                  placeholder="Describe the purpose of this automatic measurement"
                  value={wizardData.description}
                  onChange={(e) => setWizardData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-spectrum"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-between">
                <Button onClick={() => setWizardStep(1)} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={() => setWizardStep(3)} 
                  disabled={!wizardData.name.trim()}
                  className="btn-spectrum"
                >
                  Next: Timing Definition
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        // MOVED TO STEP 3: Timing Definition
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Step 3: Timing Definition</CardTitle>
              <CardDescription>Configure when the measurements should be performed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Type Selection */}
              <div className="space-y-2">
                <Label>¿Cuándo debe realizarse la medición?</Label>
                <div className="space-y-2">
                  {Object.entries(SCHEDULE_TYPES).map(([key, type]) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, schedule_type: key }
                        }))}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          wizardData.timing.schedule_type === key
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            wizardData.timing.schedule_type === key
                              ? 'border-cyan-500 bg-cyan-500'
                              : 'border-slate-600'
                          }`}>
                            {wizardData.timing.schedule_type === key && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="font-medium text-white">{type.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Span Configuration */}
              {wizardData.timing.schedule_type === 'span' && (
                <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="span_start_date">Fecha inic. (Start Date)</Label>
                      <Input
                        id="span_start_date"
                        type="date"
                        value={wizardData.timing.start_date}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, start_date: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="span_start_time">Hora inicial (Start Time)</Label>
                      <Input
                        id="span_start_time"
                        type="time"
                        step="1"
                        value={wizardData.timing.start_time}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, start_time: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="span_end_date">Fecha final (End Date)</Label>
                      <Input
                        id="span_end_date"
                        type="date"
                        value={wizardData.timing.end_date}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, end_date: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="span_end_time">Hora final (End Time)</Label>
                      <Input
                        id="span_end_time"
                        type="time"
                        step="1"
                        value={wizardData.timing.end_time}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, end_time: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Periodic Configuration */}
              {wizardData.timing.schedule_type === 'periodic' && (
                <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodic_start_date">Fecha inic. (Start Date)</Label>
                      <Input
                        id="periodic_start_date"
                        type="date"
                        value={wizardData.timing.start_date}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, start_date: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodic_end_date">Fecha final (End Date)</Label>
                      <Input
                        id="periodic_end_date"
                        type="date"
                        value={wizardData.timing.end_date}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, end_date: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                  </div>
                  
                  {/* Days of Week */}
                  <div className="space-y-2">
                    <Label>Días de la semana (Days of the Week)</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries({
                        monday: 'Lu',
                        tuesday: 'Ma',
                        wednesday: 'Mi',
                        thursday: 'Ju',
                        friday: 'Vi',
                        saturday: 'Sa',
                        sunday: 'Do'
                      }).map(([day, label]) => (
                        <button
                          key={day}
                          onClick={() => setWizardData(prev => ({
                            ...prev,
                            timing: {
                              ...prev.timing,
                              weekdays: {
                                ...prev.timing.weekdays,
                                [day]: !prev.timing.weekdays[day]
                              },
                              all_days: false
                            }
                          }))}
                          className={`px-3 py-2 rounded-lg border-2 transition-all ${
                            wizardData.timing.weekdays[day]
                              ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                              : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const allSelected = !wizardData.timing.all_days;
                          setWizardData(prev => ({
                            ...prev,
                            timing: {
                              ...prev.timing,
                              all_days: allSelected,
                              weekdays: {
                                monday: allSelected,
                                tuesday: allSelected,
                                wednesday: allSelected,
                                thursday: allSelected,
                                friday: allSelected,
                                saturday: allSelected,
                                sunday: allSelected
                              }
                            }
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg border-2 transition-all ${
                          wizardData.timing.all_days
                            ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                            : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        Todos
                      </button>
                    </div>
                  </div>
                  
                  {/* Daily Time Range */}
                  <div className="space-y-2">
                    <Label>Diariamente a las (Daily at)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="time"
                        step="1"
                        value={wizardData.timing.daily_start_time}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, daily_start_time: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                      <Input
                        type="time"
                        step="1"
                        value={wizardData.timing.daily_end_time}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, daily_end_time: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Fragmentation Section */}
              <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={wizardData.timing.fragmentation_enabled}
                    onCheckedChange={(checked) => setWizardData(prev => ({
                      ...prev,
                      timing: { ...prev.timing, fragmentation_enabled: checked }
                    }))}
                  />
                  <Label className="text-lg">Fragmentación (Fragmentation)</Label>
                </div>
                
                {wizardData.timing.fragmentation_enabled && (
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="frag_interval">Intervalo (Interval)</Label>
                      <Input
                        id="frag_interval"
                        type="time"
                        step="1"
                        value={wizardData.timing.fragmentation_interval}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, fragmentation_interval: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frag_duration">Duración (Duration)</Label>
                      <Input
                        id="frag_duration"
                        type="time"
                        step="1"
                        value={wizardData.timing.fragmentation_duration}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, fragmentation_duration: e.target.value }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frag_count">No. de Med. (No. of Measurements)</Label>
                      <Input
                        id="frag_count"
                        type="number"
                        min="1"
                        value={wizardData.timing.fragmentation_count}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, fragmentation_count: parseInt(e.target.value) }
                        }))}
                        className="input-spectrum"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={wizardData.timing.continue_after_restart}
                  onCheckedChange={(checked) => setWizardData(prev => ({
                    ...prev,
                    timing: { ...prev.timing, continue_after_restart: checked }
                  }))}
                />
                <Label>Continue automatically after ARGUS restart</Label>
              </div>
              
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setWizardStep(2)}>
                  Previous
                </Button>
                <Button onClick={() => setWizardStep(4)} className="btn-spectrum">
                  Next: Measurement Definition
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        // STEP 4: Measurement Definition (Adaptive based on station)
        const availableMeasurementTypes = wizardData.selected_station?.available_measurement_types || [];
        const isFixedFrequency = wizardData.measurement.measurement_type === 'FFM';
        const isScanType = ['SCAN', 'DSCAN', 'PSCAN', 'FLSCAN'].includes(wizardData.measurement.measurement_type);
        
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Step 4: Measurement Definition</CardTitle>
              <CardDescription>
                Configure measurement for {wizardData.selected_station?.name} ({wizardData.selected_station?.device_count} devices available)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Station Info Banner */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-300 text-sm">
                  <Radio className="w-4 h-4" />
                  <span>Station: <strong>{wizardData.selected_station?.name}</strong> • Available types: {availableMeasurementTypes.join(', ')}</span>
                </div>
              </div>
              
              {/* Measurement Type - Filtered by Station */}
              <div className="space-y-2">
                <Label>Measurement Type</Label>
                <Select 
                  value={wizardData.measurement.measurement_type}
                  onValueChange={(value) => setWizardData(prev => ({
                    ...prev,
                    measurement: { 
                      ...prev.measurement, 
                      measurement_type: value,
                      // Reset frequency mode when changing type
                      frequency_mode: value === 'FFM' ? 'S' : 'R'
                    }
                  }))}
                >
                  <SelectTrigger className="input-spectrum">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEASUREMENT_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-slate-400">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableMeasurementTypes.length > 0 && availableMeasurementTypes.length < Object.keys(MEASUREMENT_TYPES).length && (
                  <p className="text-xs text-blue-400">Showing all types. GSP reports: {availableMeasurementTypes.join(', ')}</p>
                )}
              </div>
              
              {/* Signal Path Selection (System Path) - ORM 4.2 MSP_SIG_PATH */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Signal Path
                    <span className="text-xs text-slate-400">(MSP_SIG_PATH)</span>
                  </Label>
                  <Button
                    type="button"
                    onClick={() => loadSignalPaths(wizardData.selected_station?.name)}
                    disabled={loadingSignalPaths}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${loadingSignalPaths ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <Select 
                  value={wizardData.measurement.signal_path || wizardData.measurement.device_name}
                  onValueChange={(value) => setWizardData(prev => ({
                    ...prev,
                    measurement: { 
                      ...prev.measurement, 
                      signal_path: value,
                      device_name: value // Keep for backwards compatibility
                    }
                  }))}
                  disabled={loadingSignalPaths}
                >
                  <SelectTrigger className="input-spectrum">
                    <SelectValue placeholder={loadingSignalPaths ? "Loading signal paths..." : "Select signal path..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {signalPaths.length > 0 ? (
                      signalPaths.map((path, index) => (
                        <SelectItem key={index} value={path.name}>
                          <div>
                            <div className="font-medium">{path.name}</div>
                            <div className="text-xs text-slate-400">
                              {path.freq_min && path.freq_max && 
                                `${(path.freq_min / 1000000).toFixed(1)} - ${(path.freq_max / 1000000).toFixed(1)} MHz`
                              }
                              {path.devices && path.devices.length > 0 && 
                                ` • ${path.devices.length} device${path.devices.length > 1 ? 's' : ''}`
                              }
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-paths" disabled>
                        No signal paths available. Request GSP from Configuration page.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {signalPaths.length === 0 && !loadingSignalPaths && (
                  <p className="text-xs text-yellow-400">
                    ⚠️ No signal paths found. Go to Configuration → Argus File Paths → Request GSP
                  </p>
                )}
              </div>
              
              {/* Frequency Configuration - Adaptive */}
              {isFixedFrequency && (
                <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <h4 className="font-medium text-white">Fixed Frequency Mode (FFM)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequency_single">Frequency (Hz)</Label>
                      <Input
                        id="frequency_single"
                        type="number"
                        value={wizardData.measurement.frequency_single}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          measurement: { ...prev.measurement, frequency_single: parseInt(e.target.value) }
                        }))}
                        className="input-spectrum"
                        placeholder="e.g., 100000000 (100 MHz)"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scan Configuration - Adaptive */}
              {isScanType && (
                <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <h4 className="font-medium text-white">
                    {wizardData.measurement.measurement_type === 'SCAN' ? 'Frequency Scan' : 
                     wizardData.measurement.measurement_type === 'DSCAN' ? 'Direction Finding Scan' :
                     wizardData.measurement.measurement_type === 'PSCAN' ? 'Panoramic Scan' : 'Frequency List Scan'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freq_start">Start Frequency (Hz)</Label>
                      <Input
                        id="freq_start"
                        type="number"
                        value={wizardData.measurement.frequency_range_start || 88000000}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          measurement: { 
                            ...prev.measurement, 
                            frequency_mode: 'R',
                            frequency_range_start: parseInt(e.target.value) 
                          }
                        }))}
                        className="input-spectrum"
                        placeholder="e.g., 88000000 (88 MHz)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freq_end">End Frequency (Hz)</Label>
                      <Input
                        id="freq_end"
                        type="number"
                        value={wizardData.measurement.frequency_range_end || 108000000}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          measurement: { 
                            ...prev.measurement, 
                            frequency_mode: 'R',
                            frequency_range_end: parseInt(e.target.value) 
                          }
                        }))}
                        className="input-spectrum"
                        placeholder="e.g., 108000000 (108 MHz)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freq_step">Step (Hz)</Label>
                      <Input
                        id="freq_step"
                        type="number"
                        value={wizardData.measurement.frequency_step || 100000}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          measurement: { 
                            ...prev.measurement, 
                            frequency_step: parseInt(e.target.value) 
                          }
                        }))}
                        className="input-spectrum"
                        placeholder="e.g., 100000 (100 kHz)"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Common Receiver Configuration */}
              <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <h4 className="font-medium text-white">Receiver Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rf_attenuation">RF Attenuation</Label>
                    <Select 
                      value={wizardData.measurement.receiver_config.rf_attenuation}
                      onValueChange={(value) => setWizardData(prev => ({
                        ...prev,
                        measurement: {
                          ...prev.measurement,
                          receiver_config: { ...prev.measurement.receiver_config, rf_attenuation: value }
                        }
                      }))}
                    >
                      <SelectTrigger className="input-spectrum">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto">Auto</SelectItem>
                        <SelectItem value="0">0 dB</SelectItem>
                        <SelectItem value="10">10 dB</SelectItem>
                        <SelectItem value="20">20 dB</SelectItem>
                        <SelectItem value="30">30 dB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="demodulation">Demodulation</Label>
                    <Select 
                      value={wizardData.measurement.receiver_config.demodulation}
                      onValueChange={(value) => setWizardData(prev => ({
                        ...prev,
                        measurement: {
                          ...prev.measurement,
                          receiver_config: { ...prev.measurement.receiver_config, demodulation: value }
                        }
                      }))}
                    >
                      <SelectTrigger className="input-spectrum">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FM">FM</SelectItem>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="USB">USB</SelectItem>
                        <SelectItem value="LSB">LSB</SelectItem>
                        <SelectItem value="CW">CW</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="detector">Detector</Label>
                    <Select 
                      value={wizardData.measurement.receiver_config.detector}
                      onValueChange={(value) => setWizardData(prev => ({
                        ...prev,
                        measurement: {
                          ...prev.measurement,
                          receiver_config: { ...prev.measurement.receiver_config, detector: value }
                        }
                      }))}
                    >
                      <SelectTrigger className="input-spectrum">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Peak">Peak</SelectItem>
                        <SelectItem value="RMS">RMS</SelectItem>
                        <SelectItem value="Min">Minimum</SelectItem>
                        <SelectItem value="Max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="measurement_time">Measurement Time (seconds)</Label>
                    <Input
                      id="measurement_time"
                      type="number"
                      min="1"
                      max="300"
                      value={wizardData.measurement.receiver_config.measurement_time}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        measurement: {
                          ...prev.measurement,
                          receiver_config: { ...prev.measurement.receiver_config, measurement_time: parseInt(e.target.value) }
                        }
                      }))}
                      className="input-spectrum"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setWizardStep(3)}>
                  Previous
                </Button>
                <Button 
                  onClick={() => setWizardStep(5)} 
                  disabled={!wizardData.measurement.measurement_type || !wizardData.measurement.device_name}
                  className="btn-spectrum"
                >
                  Next: Result Type
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        // STEP 5: Result Type Configuration
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Step 5: Result Type Configuration</CardTitle>
              <CardDescription>Configure the type of measurement result you expect</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="result_type" className="text-white">Result Type</Label>
                <Select
                  value={wizardData.measurement.result_type}
                  onValueChange={(value) => setWizardData(prev => ({
                    ...prev,
                    measurement: { ...prev.measurement, result_type: value }
                  }))}
                >
                  <SelectTrigger className="input-spectrum">
                    <SelectValue placeholder="Select result type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_TYPES).map(([key, { label, description }]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-slate-400">{description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {wizardData.measurement.result_type && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <BarChart3 className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-white mb-1">
                          {RESULT_TYPES[wizardData.measurement.result_type].label}
                        </h4>
                        <p className="text-sm text-slate-300">
                          {RESULT_TYPES[wizardData.measurement.result_type].description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setWizardStep(4)}>
                  Previous
                </Button>
                <Button 
                  onClick={() => setWizardStep(6)}
                  disabled={!wizardData.measurement.result_type}
                  className="btn-spectrum"
                >
                  Next: Review & Create
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        // STEP 6: Review & Create
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Step 5: Review & Create</CardTitle>
              <CardDescription>Review your AMM configuration and create it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/30 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Selected Station</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Station:</span>
                      <span className="text-white">{wizardData.selected_station?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Devices:</span>
                      <span className="text-white">{wizardData.selected_station?.device_count}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/30 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Basic Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-white">{wizardData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Description:</span>
                      <span className="text-white">{wizardData.description}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/30 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Timing Configuration</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Schedule:</span>
                      <span className="text-white">{SCHEDULE_TYPES[wizardData.timing.schedule_type].label}</span>
                    </div>
                    
                    {wizardData.timing.schedule_type !== 'always' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date Range:</span>
                          <span className="text-white">{wizardData.timing.start_date} - {wizardData.timing.end_date}</span>
                        </div>
                        {wizardData.timing.schedule_type === 'span' && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Time Range:</span>
                            <span className="text-white">{wizardData.timing.start_time} - {wizardData.timing.end_time}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {wizardData.timing.schedule_type === 'periodic' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Days:</span>
                          <span className="text-white">
                            {wizardData.timing.all_days ? 'All days' : 
                              Object.entries(wizardData.timing.weekdays)
                                .filter(([_, selected]) => selected)
                                .map(([day, _]) => day.substring(0, 3))
                                .join(', ')
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Daily Time:</span>
                          <span className="text-white">{wizardData.timing.daily_start_time} - {wizardData.timing.daily_end_time}</span>
                        </div>
                      </>
                    )}
                    
                    {wizardData.timing.fragmentation_enabled && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fragmentation:</span>
                        <span className="text-white">
                          {wizardData.timing.fragmentation_count} measurements @ {wizardData.timing.fragmentation_interval} interval
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-slate-800/30 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Measurement Configuration</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white">{MEASUREMENT_TYPES[wizardData.measurement.measurement_type].label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Frequency:</span>
                      <span className="text-white">{(wizardData.measurement.frequency_single / 1000000).toFixed(1)} MHz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IF Bandwidth:</span>
                      <span className="text-white">{wizardData.measurement.receiver_config.if_bandwidth} Hz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Result Type:</span>
                      <span className="text-white">{RESULT_TYPES[wizardData.measurement.result_type]?.label || wizardData.measurement.result_type}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setWizardStep(5)}>
                  Previous
                </Button>
                <Button onClick={handleCreateAMM} className="btn-spectrum">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create AMM Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700/50 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-700/30 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-700/30 rounded-lg animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-white">Automatic Mode (AMM)</h1>
          <p className="text-slate-400">Configure and manage automatic spectrum measurements</p>
        </div>
        <Button onClick={() => setActiveTab('wizard')} className="btn-spectrum">
          <Plus className="w-4 h-4 mr-2" />
          Create AMM Configuration
        </Button>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="wizard" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>AMM Wizard</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Calendar View</span>
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Executions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          {renderDashboard()}
        </TabsContent>

        <TabsContent value="wizard">
          <div className="space-y-6">
            {/* Wizard Progress */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === wizardStep 
                      ? 'bg-blue-500 text-white'
                      : step < wizardStep 
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step < wizardStep ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      step < wizardStep ? 'bg-green-500' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            
            {renderWizardStep()}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <AMMCalendarView />
        </TabsContent>

        <TabsContent value="executions">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">AMM Executions</CardTitle>
              <CardDescription>Recent automatic measurement executions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Recent Executions</h3>
                <p className="text-slate-400">Execution history will appear here once AMM configurations are running</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
