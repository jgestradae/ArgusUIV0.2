import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Clock, CheckCircle, XCircle, RefreshCw, Eye, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ReportList = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  const navigate = useNavigate();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadReports();
    // Refresh every 10 seconds to check for completed reports
    const interval = setInterval(loadReports, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadReports = async () => {
    try {
      const params = filter !== 'all' ? { report_type: filter } : {};
      const response = await axios.get(`${backendUrl}/api/reports/list`, {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('argus_token')}`
        }
      });

      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reportId, format = 'PDF') => {
    try {
      const response = await fetch(
        `${backendUrl}/api/reports/${reportId}/download?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('argus_token')}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${reportId}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Report downloaded as ${format}`);
      } else {
        toast.error('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `${backendUrl}/api/reports/${reportId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('argus_token')}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Report deleted');
        loadReports();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete report');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'generating':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      generating: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status] || styles.generating}`}>
        {status}
      </span>
    );
  };

  const reportTypes = [
    { value: 'all', label: 'All Reports' },
    { value: 'measurement_results', label: 'Measurements' },
    { value: 'station_status', label: 'Station Status' },
    { value: 'system_performance', label: 'Performance' },
    { value: 'user_activity', label: 'User Activity' },
    { value: 'frequency_occupancy', label: 'Frequency Occupancy' }
  ];

  return (
    <div className="h-full overflow-y-auto bg-transparent p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card border-0 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-white">Reports</h1>
              </div>
              <p className="text-slate-400">
                View, download, and manage generated reports
              </p>
            </div>
            <button
              onClick={loadReports}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="glass-card border-0 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {reportTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  filter === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-slate-300 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="glass-card border-0 rounded-lg shadow-sm p-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-400">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="glass-card border-0 rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No reports found</p>
            <p className="text-slate-500 text-sm">Create a new report to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="glass-card border-0 rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(report.status)}
                      <h3 className="text-lg font-semibold text-white">
                        {report.report_name}
                      </h3>
                      {getStatusBadge(report.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-slate-400">Type:</span>
                        <span className="ml-2 font-medium text-white">
                          {report.report_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Created By:</span>
                        <span className="ml-2 font-medium text-white">
                          {report.created_by}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Created:</span>
                        <span className="ml-2 font-medium text-white">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {report.description && (
                      <p className="text-slate-400 text-sm mt-3">{report.description}</p>
                    )}

                    {report.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800 text-sm">
                          <strong>Error:</strong> {report.error_message}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {report.status === 'completed' && (
                    <div className="flex flex-col gap-2 ml-6">
                      {report.export_formats && report.export_formats.map(format => (
                        <button
                          key={format}
                          onClick={() => handleDownload(report.id, format)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          {format}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}

                  {report.status === 'generating' && (
                    <div className="ml-6 flex items-center gap-2 text-yellow-600">
                      <Clock className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Generating...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/reports/generate')}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center gap-2"
        title="Create New Report"
      >
        <Plus className="w-6 h-6" />
        <span className="font-medium">New Report</span>
      </button>
    </div>
  );
};

export default ReportList;