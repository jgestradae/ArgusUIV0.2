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
  DSCAN: { label: 'D-Scan', description: 'Direction finding scan' },
  PSCAN: { label: 'P-Scan', description: 'Panoramic scan' },
  FLSCAN: { label: 'Frequency List Scan', description: 'Scan predefined frequencies' },
  LOCATION: { label: 'Location Measurement', description: 'Direction finding and location' },
  COVERAGE: { label: 'Coverage Measurement', description: 'Coverage area analysis' }
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
  const [wizardStep, setWizardStep] = useState(1);
  const [availableStations, setAvailableStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [wizardData, setWizardData] = useState({
    // Station Selection (New Step 1)
    selected_station: null,
    
    // Basic Info
    name: '',
    description: '',
    
    // Timing Definition
    timing: {
      schedule_type: 'daily',
      start_time: '09:00',
      end_time: '17:00',
      weekdays: [0, 1, 2, 3, 4], // Mon-Fri
      interval_hours: 1,
      continue_after_restart: true
    },
    
    // Measurement Definition
    measurement: {
      measurement_type: 'FFM',
      device_name: 'HE500-PR100-1',
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

  const handleCreateAMM = async () => {
    try {
      await axios.post(`${API}/amm/configurations`, wizardData);
      toast.success('AMM configuration created successfully');
      setActiveTab('dashboard');
      setWizardStep(1);
      loadData();
    } catch (error) {
      toast.error('Failed to create AMM configuration');
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
                      onClick={() => setWizardData(prev => ({ ...prev, selected_station: station }))}
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
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(SCHEDULE_TYPES).map(([key, type]) => {
                    const Icon = type.icon;
                    const isSelected = wizardData.timing.schedule_type === key;
                    
                    return (
                      <div
                        key={key}
                        onClick={() => setWizardData(prev => ({
                          ...prev,
                          timing: { ...prev.timing, schedule_type: key }
                        }))}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : 'border-slate-700/50 hover:border-slate-600/50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{type.label}</span>
                        </div>
                        <p className="text-xs text-slate-400">{type.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {wizardData.timing.schedule_type === 'daily' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={wizardData.timing.start_time}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        timing: { ...prev.timing, start_time: e.target.value }
                      }))}
                      className="input-spectrum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={wizardData.timing.end_time}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        timing: { ...prev.timing, end_time: e.target.value }
                      }))}
                      className="input-spectrum"
                    />
                  </div>
                </div>
              )}
              
              {wizardData.timing.schedule_type === 'interval' && (
                <div className="space-y-2">
                  <Label htmlFor="interval_hours">Interval (Hours)</Label>
                  <Input
                    id="interval_hours"
                    type="number"
                    min="1"
                    max="24"
                    value={wizardData.timing.interval_hours}
                    onChange={(e) => setWizardData(prev => ({
                      ...prev,
                      timing: { ...prev.timing, interval_hours: parseInt(e.target.value) }
                    }))}
                    className="input-spectrum"
                  />
                </div>
              )}
              
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
        // MOVED TO STEP 4: Measurement Definition
        return (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Step 4: Measurement Definition</CardTitle>
              <CardDescription>Configure the measurement parameters based on {wizardData.selected_station?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Measurement Type</Label>
                  <Select 
                    value={wizardData.measurement.measurement_type}
                    onValueChange={(value) => setWizardData(prev => ({
                      ...prev,
                      measurement: { ...prev.measurement, measurement_type: value }
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="device_name">Device</Label>
                  <Input
                    id="device_name"
                    value={wizardData.measurement.device_name}
                    onChange={(e) => setWizardData(prev => ({
                      ...prev,
                      measurement: { ...prev.measurement, device_name: e.target.value }
                    }))}
                    className="input-spectrum"
                  />
                </div>
              </div>
              
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
                  placeholder="100000000"
                />
                <p className="text-xs text-slate-400">Example: 100000000 = 100 MHz</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="if_bandwidth">IF Bandwidth (Hz)</Label>
                  <Input
                    id="if_bandwidth"
                    type="number"
                    value={wizardData.measurement.receiver_config.if_bandwidth}
                    onChange={(e) => setWizardData(prev => ({
                      ...prev,
                      measurement: {
                        ...prev.measurement,
                        receiver_config: {
                          ...prev.measurement.receiver_config,
                          if_bandwidth: parseInt(e.target.value)
                        }
                      }
                    }))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>RF Attenuation</Label>
                  <Select 
                    value={wizardData.measurement.receiver_config.rf_attenuation}
                    onValueChange={(value) => setWizardData(prev => ({
                      ...prev,
                      measurement: {
                        ...prev.measurement,
                        receiver_config: {
                          ...prev.measurement.receiver_config,
                          rf_attenuation: value
                        }
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
                  <Label htmlFor="measurement_time">Measurement Time (s)</Label>
                  <Input
                    id="measurement_time"
                    type="number"
                    value={wizardData.measurement.receiver_config.measurement_time}
                    onChange={(e) => setWizardData(prev => ({
                      ...prev,
                      measurement: {
                        ...prev.measurement,
                        receiver_config: {
                          ...prev.measurement.receiver_config,
                          measurement_time: parseInt(e.target.value)
                        }
                      }
                    }))}
                    className="input-spectrum"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setWizardStep(3)}>
                  Previous
                </Button>
                <Button onClick={() => setWizardStep(5)} className="btn-spectrum">
                  Next: Review & Create
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        // STEP 5: Review & Create
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
                    {wizardData.timing.start_time && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Range:</span>
                        <span className="text-white">{wizardData.timing.start_time} - {wizardData.timing.end_time}</span>
                      </div>
                    )}
                    {wizardData.timing.interval_hours && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Interval:</span>
                        <span className="text-white">Every {wizardData.timing.interval_hours} hours</span>
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
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setWizardStep(4)}>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="wizard" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>AMM Wizard</span>
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
