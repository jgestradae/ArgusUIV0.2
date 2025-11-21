import React, { useState, useEffect } from 'react';
import { FileText, Upload, Save, Edit, Trash2, CheckCircle, Image, User, Building } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const ReportTemplates = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    template_name: 'Default Template',
    header_title: 'Measurement Report',
    description: '',
    operator_name: '',
    organization: 'National Spectrum Agency - ANE',
    include_metadata: true,
    include_data_table: true,
    data_row_limit: 10000
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    loadActiveTemplate();
  }, []);

  const loadActiveTemplate = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/report-templates/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('argus_token')}`
        }
      });

      if (response.data.success && response.data.template) {
        setActiveTemplate(response.data.template);
        setFormData({
          template_name: response.data.template.template_name,
          header_title: response.data.template.header_title,
          description: response.data.template.description || '',
          operator_name: response.data.template.operator_name || '',
          organization: response.data.template.organization || 'National Spectrum Agency - ANE',
          include_metadata: response.data.template.include_metadata !== false,
          include_data_table: response.data.template.include_data_table !== false,
          data_row_limit: response.data.template.data_row_limit || 10000
        });
        
        // Load logo if exists
        if (response.data.template.logo_url) {
          setLogoPreview(`${backendUrl}${response.data.template.logo_url}`);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    
    try {
      // Update template data
      const response = await axios.put(
        `${backendUrl}/api/report-templates/${activeTemplate.id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('argus_token')}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Template updated successfully');
        
        // Upload logo if changed
        if (logoFile) {
          await uploadLogo();
        }
        
        setEditMode(false);
        loadActiveTemplate();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile || !activeTemplate) return;
    
    const formData = new FormData();
    formData.append('file', logoFile);
    
    try {
      const response = await axios.post(
        `${backendUrl}/api/report-templates/${activeTemplate.id}/upload-logo`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('argus_token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Logo uploaded successfully');
        setLogoFile(null);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              Report Template Configuration
            </h1>
            <p className="text-slate-400 mt-2">
              Customize report appearance and content
            </p>
          </div>
          
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all"
            >
              <Edit className="w-5 h-5" />
              Edit Template
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditMode(false);
                  loadActiveTemplate();
                  setLogoFile(null);
                }}
                className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Template Form */}
      <div className="space-y-6">
        {/* Logo Section */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-400" />
            Organization Logo
          </h3>
          
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 object-contain border-2 border-slate-600 rounded-lg bg-white p-2"
                  />
                  {editMode && (
                    <button
                      onClick={() => {
                        setLogoPreview(null);
                        setLogoFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center bg-slate-900/50">
                  <Image className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
            
            {/* Upload Button */}
            {editMode && (
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-slate-300 font-medium">Click to upload logo</span>
                      <span className="text-xs text-slate-500">PNG, JPG up to 5MB</span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                {logoFile && (
                  <p className="text-sm text-green-400 mt-2">
                    ✓ New logo selected: {logoFile.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Report Header Settings */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Report Header
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Template Name
              </label>
              <input
                type="text"
                name="template_name"
                value={formData.template_name}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Default Template"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Report Title
              </label>
              <input
                type="text"
                name="header_title"
                value={formData.header_title}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Measurement Report"
              />
              <p className="text-xs text-slate-500 mt-1">This will appear as the main title on all reports</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description / Introduction
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={!editMode}
                rows="4"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Enter a description or introduction paragraph that will appear in all reports..."
              />
            </div>
          </div>
        </div>

        {/* Organization & Signature */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            Organization & Signature
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="National Spectrum Agency - ANE"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Operator Name (for signature)
              </label>
              <input
                type="text"
                name="operator_name"
                value={formData.operator_name}
                onChange={handleInputChange}
                disabled={!editMode}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="John Doe, Senior Spectrum Analyst"
              />
              <p className="text-xs text-slate-500 mt-1">This name will appear at the end of reports as the operator signature</p>
            </div>
          </div>
        </div>

        {/* Content Settings */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">
            Report Content Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-slate-300">Include Measurement Metadata</label>
                <p className="text-xs text-slate-500 mt-1">Show report ID, type, date, filters, etc.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="include_metadata"
                  checked={formData.include_metadata}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-slate-300">Include Data Tables</label>
                <p className="text-xs text-slate-500 mt-1">Show measurement results in table format</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="include_data_table"
                  checked={formData.include_data_table}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Maximum Data Rows per Report
              </label>
              <input
                type="number"
                name="data_row_limit"
                value={formData.data_row_limit}
                onChange={handleInputChange}
                disabled={!editMode}
                min="100"
                max="100000"
                step="100"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-slate-500 mt-1">Limit data rows to prevent large file sizes (recommended: 10,000)</p>
            </div>
          </div>
        </div>

        {/* Preview Info */}
        {!editMode && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Active Template</h4>
                <p className="text-slate-300 text-sm">
                  This template is currently active and will be used for all new report generations.
                  Click "Edit Template" to modify settings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportTemplates;
