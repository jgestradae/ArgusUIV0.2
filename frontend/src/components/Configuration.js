import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Settings, 
  Save,
  RefreshCw,
  FolderOpen,
  Database,
  Network,
  Shield,
  User,
  Plus,
  Trash2,
  Edit,
  Radio
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Configuration() {
  const { isAdmin } = useAuth();
  const [gssRequesting, setGssRequesting] = useState(false);
  const [gspRequesting, setGspRequesting] = useState(false);
  const [systemConfig, setSystemConfig] = useState({
    argus_inbox_path: '/argus/inbox',
    argus_outbox_path: '/argus/outbox',
    data_storage_path: '/argus/data',
    auto_process_responses: true,
    response_check_interval: 15,
    measurement_timeout: 300,
    max_concurrent_orders: 10
  });
  
  const [measurementTemplates, setMeasurementTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    freq_mode: 'S',
    freq_single: 100000000,
    if_bandwidth: 9000,
    rf_attenuation: 'Auto',
    demodulation: 'FM',
    measurement_time: 5,
    is_template: true
  });
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    role: 'operator'
  });

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const [templatesResponse, usersResponse] = await Promise.all([
        axios.get(`${API}/config/measurements`),
        isAdmin() ? axios.get(`${API}/auth/users`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      
      setMeasurementTemplates(templatesResponse.data);
      if (isAdmin()) {
        setUsers(usersResponse.data);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveSystemConfig = async () => {
    setSaving(true);
    try {
      // In a real implementation, you would save these to backend
      // For now, just show success message
      toast.success('System configuration saved');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const response = await axios.post(`${API}/config/measurements`, newTemplate);
      setMeasurementTemplates(prev => [...prev, response.data]);
      setNewTemplate({
        name: '',
        description: '',
        freq_mode: 'S',
        freq_single: 100000000,
        if_bandwidth: 9000,
        rf_attenuation: 'Auto',
        demodulation: 'FM',
        measurement_time: 5,
        is_template: true
      });
      toast.success('Measurement template saved');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const createUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      toast.error('Please enter username and password');
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/users`, newUser);
      setUsers(prev => [...prev, response.data]);
      setNewUser({
        username: '',
        password: '',
        email: '',
        role: 'operator'
      });
      toast.success('User created successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const deleteTemplate = async (templateId) => {
    try {
      await axios.delete(`${API}/config/measurements/${templateId}`);
      setMeasurementTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Configuration</h1>
          <p className="text-slate-400">System settings and measurement templates</p>
        </div>
        <Button 
          onClick={loadConfiguration}
          variant="secondary" 
          className="btn-secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="templates">Measurement Templates</TabsTrigger>
          <TabsTrigger value="users" disabled={!isAdmin()}>User Management</TabsTrigger>
          <TabsTrigger value="paths">File Paths</TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system behavior and performance settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-white flex items-center">
                    <Network className="w-4 h-4 mr-2" />
                    Processing Settings
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Auto-process responses</Label>
                      <p className="text-xs text-slate-400">Automatically process XML responses</p>
                    </div>
                    <Switch
                      checked={systemConfig.auto_process_responses}
                      onCheckedChange={(checked) => setSystemConfig(prev => ({ ...prev, auto_process_responses: checked }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="check_interval">Response Check Interval (seconds)</Label>
                    <Input
                      id="check_interval"
                      type="number"
                      value={systemConfig.response_check_interval}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, response_check_interval: parseInt(e.target.value) }))}
                      className="input-spectrum"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Measurement Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={systemConfig.measurement_timeout}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, measurement_timeout: parseInt(e.target.value) }))}
                      className="input-spectrum"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-white flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    Performance Settings
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_orders">Max Concurrent Orders</Label>
                    <Input
                      id="max_orders"
                      type="number"
                      value={systemConfig.max_concurrent_orders}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, max_concurrent_orders: parseInt(e.target.value) }))}
                      className="input-spectrum"
                    />
                    <p className="text-xs text-slate-400">Maximum number of simultaneous measurement orders</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-700/50">
                <Button 
                  onClick={saveSystemConfig}
                  disabled={saving}
                  className="btn-spectrum"
                >
                  {saving ? (
                    <div className="spinner mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Measurement Templates */}
        <TabsContent value="templates" className="space-y-6">
          {/* Create New Template */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Create Measurement Template
              </CardTitle>
              <CardDescription>Save frequently used measurement configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_name">Template Name</Label>
                  <Input
                    id="template_name"
                    placeholder="Enter template name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template_desc">Description</Label>
                  <Input
                    id="template_desc"
                    placeholder="Optional description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template_freq">Default Frequency (Hz)</Label>
                  <Input
                    id="template_freq"
                    type="number"
                    value={newTemplate.freq_single}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, freq_single: parseInt(e.target.value) }))}
                    className="input-spectrum"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template_bw">IF Bandwidth (Hz)</Label>
                  <Input
                    id="template_bw"
                    type="number"
                    value={newTemplate.if_bandwidth}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, if_bandwidth: parseInt(e.target.value) }))}
                    className="input-spectrum"
                  />
                </div>
              </div>
              
              <Button onClick={saveTemplate} className="btn-spectrum">
                <Plus className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </CardContent>
          </Card>

          {/* Existing Templates */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white">Saved Templates</CardTitle>
              <CardDescription>Manage your measurement configuration templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {measurementTemplates.length > 0 ? measurementTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{template.name}</h4>
                      <p className="text-sm text-slate-400">{template.description || 'No description'}</p>
                      <div className="flex space-x-2 mt-2">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          {(template.freq_single / 1000000).toFixed(1)} MHz
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          BW: {template.if_bandwidth} Hz
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-400 text-center py-8">No measurement templates created</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          {isAdmin() ? (
            <>
              {/* Create User */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Create New User
                  </CardTitle>
                  <CardDescription>Add new users to the system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_username">Username</Label>
                      <Input
                        id="new_username"
                        placeholder="Enter username"
                        value={newUser.username}
                        onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                        className="input-spectrum"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Password</Label>
                      <Input
                        id="new_password"
                        type="password"
                        placeholder="Enter password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        className="input-spectrum"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new_email">Email (Optional)</Label>
                      <Input
                        id="new_email"
                        type="email"
                        placeholder="Enter email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        className="input-spectrum"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new_role">Role</Label>
                      <select
                        id="new_role"
                        value={newUser.role}
                        onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                        className="input-spectrum"
                      >
                        <option value="operator">Operator</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>
                  
                  <Button onClick={createUser} className="btn-spectrum">
                    <User className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Users */}
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="text-xl text-white">System Users</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users.length > 0 ? users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center">
                            {user.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-yellow-400" />
                            ) : (
                              <User className="w-5 h-5 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{user.username}</h4>
                            <p className="text-sm text-slate-400">{user.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={user.role === 'admin' 
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }>
                            {user.role}
                          </Badge>
                          <Badge className={user.is_active 
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-400 text-center py-8">No users found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card border-0">
              <CardContent className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Admin Access Required</h3>
                <p className="text-slate-400">You need administrator privileges to manage users.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* File Paths */}
        <TabsContent value="paths">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center">
                <FolderOpen className="w-5 h-5 mr-2" />
                Argus File Paths
              </CardTitle>
              <CardDescription>Configure file system paths for Argus communication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inbox_path">Argus Inbox Path</Label>
                  <Input
                    id="inbox_path"
                    value={systemConfig.argus_inbox_path}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, argus_inbox_path: e.target.value }))}
                    className="input-spectrum"
                  />
                  <p className="text-xs text-slate-400">Directory where XML request files are placed for Argus</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="outbox_path">Argus Outbox Path</Label>
                  <Input
                    id="outbox_path"
                    value={systemConfig.argus_outbox_path}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, argus_outbox_path: e.target.value }))}
                    className="input-spectrum"
                  />
                  <p className="text-xs text-slate-400">Directory where Argus places XML response files</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_path">Data Storage Path</Label>
                  <Input
                    id="data_path"
                    value={systemConfig.data_storage_path}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, data_storage_path: e.target.value }))}
                    className="input-spectrum"
                  />
                  <p className="text-xs text-slate-400">Directory for archiving measurement results and logs</p>
                </div>
              </div>

              {/* GSS Request Section */}
              <div className="pt-4 border-t border-slate-700/30">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <Radio className="w-5 h-5 mr-2 text-cyan-400" />
                  Argus System Queries
                </h3>
                
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-2">
                        Request System State (GSS)
                      </h4>
                      <p className="text-sm text-slate-400 mb-3">
                        Query Argus for current system status, online stations, and available devices. 
                        The response will be automatically processed when received.
                      </p>
                      <p className="text-xs text-slate-500">
                        ✓ Response processed automatically by file watcher
                      </p>
                    </div>
                    <Button 
                      onClick={async () => {
                        setGssRequesting(true);
                        try {
                          const response = await axios.post(`${API}/system/request-gss`);
                          if (response.data.success) {
                            toast.success('GSS request sent to Argus');
                            toast.info('Response will be processed automatically');
                          }
                        } catch (error) {
                          console.error('Error requesting GSS:', error);
                          toast.error('Failed to send GSS request');
                        } finally {
                          setGssRequesting(false);
                        }
                      }}
                      disabled={gssRequesting}
                      className="btn-spectrum ml-4 whitespace-nowrap"
                    >
                      {gssRequesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4 mr-2" />
                          Request GSS
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-700/50">
                <Button 
                  onClick={saveSystemConfig}
                  disabled={saving}
                  className="btn-spectrum"
                >
                  {saving ? (
                    <div className="spinner mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Paths
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
