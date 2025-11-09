import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Shield, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ADConfiguration() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadADStatus();
  }, []);

  const loadADStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/ad/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setConfig(response.data.config);
        setConnectionStatus(response.data.connection);
      }
    } catch (error) {
      console.error('Error loading AD status:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
      } else {
        toast.error('Failed to load AD status');
      }
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/ad/test-connection`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('AD Connection Test Successful', {
          description: response.data.message
        });
        setConnectionStatus(response.data);
      } else {
        toast.error('AD Connection Test Failed', {
          description: response.data.message
        });
        setConnectionStatus(response.data);
      }
    } catch (error) {
      console.error('Error testing AD connection:', error);
      toast.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            Active Directory Configuration
          </h1>
          <p className="text-gray-400 mt-1">Manage LDAP authentication settings</p>
        </div>
        <Button
          onClick={loadADStatus}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5" />
            Current Status
          </CardTitle>
          <CardDescription>Active Directory authentication status and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Authentication Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">AD Authentication</span>
                  <Badge
                    variant={config?.enabled ? 'default' : 'secondary'}
                    className={config?.enabled ? 'bg-green-600' : 'bg-gray-600'}
                  >
                    {config?.enabled ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Disabled
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">Connection Status</span>
                  <Badge
                    variant={connectionStatus?.success ? 'default' : 'destructive'}
                    className={connectionStatus?.success ? 'bg-green-600' : 'bg-red-600'}
                  >
                    {connectionStatus?.success ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Connected
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Not Connected
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">Bind User Configured</span>
                  <Badge variant="secondary" className="bg-gray-700">
                    {config?.bind_user_configured ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={testConnection}
                disabled={testing || !config?.enabled}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Server Configuration</h3>
              <div className="space-y-2">
                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Server</div>
                  <div className="text-white font-mono text-sm">{config?.server || 'Not configured'}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Port</div>
                  <div className="text-white font-mono text-sm">{config?.port || 'Not configured'}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Domain</div>
                  <div className="text-white font-mono text-sm">{config?.domain || 'Not configured'}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Base DN</div>
                  <div className="text-white font-mono text-sm break-all">{config?.base_dn || 'Not configured'}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">SSL/TLS</div>
                  <div className="text-white font-mono text-sm">{config?.use_ssl ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
            </div>
          </div>

          {connectionStatus && !connectionStatus.success && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <div className="text-red-300 font-medium">Connection Error</div>
                  <div className="text-red-400 text-sm mt-1">{connectionStatus.message}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              Active Directory authentication is configured via environment variables in the backend <code className="px-1.5 py-0.5 bg-gray-900 rounded">/.env</code> file.
            </p>
            <div className="bg-gray-900 p-4 rounded-lg font-mono text-xs space-y-1">
              <div><span className="text-green-400">AD_ENABLED</span>=<span className="text-yellow-400">true</span></div>
              <div><span className="text-green-400">AD_SERVER</span>=<span className="text-yellow-400">ldap://192.168.10.20</span></div>
              <div><span className="text-green-400">AD_PORT</span>=<span className="text-yellow-400">389</span></div>
              <div><span className="text-green-400">AD_DOMAIN</span>=<span className="text-yellow-400">ANE.LOCAL</span></div>
              <div><span className="text-green-400">AD_BASE_DN</span>=<span className="text-yellow-400">DC=ANE,DC=LOCAL</span></div>
              <div><span className="text-green-400">AD_BIND_USER</span>=<span className="text-yellow-400">argus_auth</span></div>
              <div><span className="text-green-400">AD_BIND_PASSWORD</span>=<span className="text-yellow-400">********</span></div>
              <div><span className="text-green-400">AD_USE_SSL</span>=<span className="text-yellow-400">false</span></div>
            </div>
            <p className="mt-3">
              <strong className="text-white">Authentication Flow:</strong> When AD is enabled, the system first attempts Active Directory authentication. 
              If AD authentication fails or is disabled, it falls back to local database authentication.
            </p>
            <p>
              <strong className="text-white">User Creation:</strong> Users authenticated via AD are automatically created in the local database on first login.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
