import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { 
  Shield, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Settings,
  Edit,
  Save,
  X,
  Lock
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
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state for editing
  const [formData, setFormData] = useState({
    enabled: false,
    server: '',
    port: 389,
    domain: '',
    base_dn: '',
    bind_user: '',
    bind_password: '',
    use_ssl: false
  });

  useEffect(() => {
    loadADStatus();
  }, []);

  const loadADStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('argus_token');
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
        toast.error(t('ad.access_denied'));
      } else {
        toast.error(t('ad.load_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConfigForEdit = async () => {
    try {
      const token = localStorage.getItem('argus_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/ad/config/encrypted`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.config) {
        setFormData({
          enabled: response.data.config.enabled || false,
          server: response.data.config.server || '',
          port: response.data.config.port || 389,
          domain: response.data.config.domain || '',
          base_dn: response.data.config.base_dn || '',
          bind_user: response.data.config.bind_user || '',
          bind_password: response.data.config.bind_password || '',
          use_ssl: response.data.config.use_ssl || false
        });
        setEditMode(true);
      } else {
        // No config exists, start with defaults
        setEditMode(true);
      }
    } catch (error) {
      console.error('Error loading config for edit:', error);
      toast.error('Failed to load configuration for editing');
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('argus_token');
      const response = await axios.post(
        `${BACKEND_URL}/api/ad/config/save`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('AD Configuration Saved', {
          description: 'Configuration encrypted and stored securely'
        });
        setEditMode(false);
        loadADStatus();
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration', {
        description: error.response?.data?.detail || error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('argus_token');
      const response = await axios.post(
        `${BACKEND_URL}/api/ad/test-connection`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(t('ad.test_success'), {
          description: response.data.message
        });
        setConnectionStatus(response.data);
      } else {
        toast.error(t('ad.test_failed'), {
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

  // Edit Mode View
  if (editMode) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Edit className="h-8 w-8 text-emerald-500" />
              Edit AD Configuration
            </h1>
            <p className="text-gray-400 mt-1">All data will be encrypted before storage</p>
          </div>
          <Button
            onClick={() => setEditMode(false)}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-500" />
              Encrypted Configuration Form
            </CardTitle>
            <CardDescription>
              Enter Active Directory details. All sensitive information will be encrypted using AES-256.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Enable/Disable Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                <div>
                  <Label className="text-white font-medium">Enable AD Authentication</Label>
                  <p className="text-sm text-gray-400 mt-1">Toggle Active Directory authentication on/off</p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                />
              </div>

              {/* Server Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-500" />
                    Server Address *
                  </Label>
                  <Input
                    value={formData.server}
                    onChange={(e) => setFormData({...formData, server: e.target.value})}
                    placeholder="ldap://192.168.10.20"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">Format: ldap://server or ldaps://server</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Port</Label>
                  <Input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                    placeholder="389"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">Standard: 389 (LDAP), 636 (LDAPS)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-500" />
                    Domain *
                  </Label>
                  <Input
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    placeholder="ANE.LOCAL"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">Your Windows domain name</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-500" />
                    Base DN *
                  </Label>
                  <Input
                    value={formData.base_dn}
                    onChange={(e) => setFormData({...formData, base_dn: e.target.value})}
                    placeholder="DC=ANE,DC=LOCAL"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">LDAP base distinguished name</p>
                </div>
              </div>

              {/* Bind User (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-500" />
                    Bind User (Optional)
                  </Label>
                  <Input
                    value={formData.bind_user}
                    onChange={(e) => setFormData({...formData, bind_user: e.target.value})}
                    placeholder="service_account"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">Service account for LDAP queries</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-yellow-500" />
                    Bind Password (Optional)
                  </Label>
                  <Input
                    type="password"
                    value={formData.bind_password}
                    onChange={(e) => setFormData({...formData, bind_password: e.target.value})}
                    placeholder="••••••••"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500">Service account password</p>
                </div>
              </div>

              {/* SSL/TLS */}
              <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                <div>
                  <Label className="text-white font-medium">Use SSL/TLS</Label>
                  <p className="text-sm text-gray-400 mt-1">Enable secure LDAP connection (LDAPS)</p>
                </div>
                <Switch
                  checked={formData.use_ssl}
                  onCheckedChange={(checked) => setFormData({...formData, use_ssl: checked})}
                />
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-emerald-300 font-medium">Encryption Active</div>
                    <div className="text-emerald-400 text-sm mt-1">
                      All sensitive fields (Server, Domain, Base DN, Bind User, Password) will be encrypted with AES-256 before storage.
                      Data is only decrypted in memory when needed for authentication.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={() => setEditMode(false)}
                  variant="outline"
                  className="border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveConfiguration}
                  disabled={saving || !formData.server || !formData.domain || !formData.base_dn}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Configuration (Encrypted)'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View Mode (Default)
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            {t('ad.title')}
          </h1>
          <p className="text-gray-400 mt-1">{t('ad.description')}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadADStatus}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('ad.refresh')}
          </Button>
          <Button
            onClick={loadConfigForEdit}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Configuration
          </Button>
        </div>
      </div>

      {/* Encryption Status Badge */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-emerald-300 font-medium">Encrypted Storage Enabled</div>
            <div className="text-emerald-400 text-sm mt-1">
              All Active Directory configuration is stored encrypted in the database. Only the master encryption key is stored in the .env file.
            </div>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t('ad.status')}
          </CardTitle>
          <CardDescription>
            {t('ad.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{t('ad.authentication_status')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">{t('ad.ad_auth')}</span>
                  <Badge
                    variant={config?.enabled ? 'default' : 'secondary'}
                    className={config?.enabled ? 'bg-green-600' : 'bg-gray-600'}
                  >
                    {config?.enabled ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {t('ad.enabled')}
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        {t('ad.disabled')}
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">{t('ad.connection_status')}</span>
                  <Badge
                    variant={connectionStatus?.success ? 'default' : 'destructive'}
                    className={connectionStatus?.success ? 'bg-green-600' : 'bg-red-600'}
                  >
                    {connectionStatus?.success ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {t('ad.connected')}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {t('ad.not_connected')}
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <span className="text-gray-300">{t('ad.bind_user_configured')}</span>
                  <Badge variant="secondary" className="bg-gray-700">
                    {config?.bind_user_configured ? t('common.yes') : t('common.no')}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={testConnection}
                disabled={testing || !config?.enabled}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                {testing ? t('ad.testing') : t('ad.test_connection')}
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">{t('ad.server_config')}</h3>
              <div className="space-y-2">
                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{t('ad.server')}</div>
                  <div className="text-white font-mono text-sm flex items-center gap-2">
                    <Lock className="h-3 w-3 text-yellow-500" />
                    {config?.server || t('ad.not_configured')}
                  </div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{t('ad.port')}</div>
                  <div className="text-white font-mono text-sm">{config?.port || t('ad.not_configured')}</div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{t('ad.domain')}</div>
                  <div className="text-white font-mono text-sm flex items-center gap-2">
                    <Lock className="h-3 w-3 text-yellow-500" />
                    {config?.domain || t('ad.not_configured')}
                  </div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{t('ad.base_dn')}</div>
                  <div className="text-white font-mono text-sm break-all flex items-center gap-2">
                    <Lock className="h-3 w-3 text-yellow-500" />
                    {config?.base_dn || t('ad.not_configured')}
                  </div>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{t('ad.ssl_tls')}</div>
                  <div className="text-white font-mono text-sm">{config?.use_ssl ? t('ad.enabled') : t('ad.disabled')}</div>
                </div>
              </div>
            </div>
          </div>

          {connectionStatus && !connectionStatus.success && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <div className="text-red-300 font-medium">{t('ad.connection_error')}</div>
                  <div className="text-red-400 text-sm mt-1">{connectionStatus.message}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
