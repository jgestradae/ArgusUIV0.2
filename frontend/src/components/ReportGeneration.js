import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ReportGeneration = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  
  const [reportType, setReportType] = useState('measurement_results');
  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');
  const [exportFormat, setExportFormat] = useState('PDF');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedReportId, setGeneratedReportId] = useState(null);

  const reportTypes = [
    { value: 'measurement_results', label: 'Measurement Results', description: 'Frequency scans, levels, measurements' },
    { value: 'station_status', label: 'Station Status', description: 'Station availability and health' },
    { value: 'system_performance', label: 'System Performance', description: 'System statistics and metrics' },
    { value: 'user_activity', label: 'User Activity', description: 'User logins and actions' },
    { value: 'frequency_occupancy', label: 'Frequency Occupancy', description: 'Spectrum utilization analysis' }
  ];

  const exportFormats = ['PDF', 'CSV', 'EXCEL', 'DOCX', 'XML'];

  const handleGenerateReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    setLoading(true);
    setGeneratedReportId(null);

    try {
      const requestBody = {
        report_type: reportType,
        report_name: reportName,
        description: description || null,
        export_format: exportFormat,
        filters: {
          start_date: startDate || null,
          end_date: endDate || null
        },
        include_charts: true,
        include_summary: true
      };

      const response = await fetch(`${backendUrl}/api/reports/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('argus_token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Report generation started!');
        setGeneratedReportId(data.report_id);
        
        // Reset form
        setReportName('');
        setDescription('');
      } else {
        toast.error(data.detail || 'Failed to create report');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const selectedReportType = reportTypes.find(rt => rt.value === reportType);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-card border-0 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Report Generation</h1>
          </div>
          <p className="text-slate-400">
            Create comprehensive reports in multiple formats (PDF, CSV, Excel, DOCX, XML)
          </p>
        </div>

        {/* Success Message */}
        {generatedReportId && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-300 font-medium">Report generation started!</p>
              <p className="text-green-200 text-sm mt-1">
                Report ID: <code className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded">{generatedReportId}</code>
              </p>
              <p className="text-green-200 text-sm mt-1">
                You can check the status in the Reports List page
              </p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="glass-card border-0 rounded-lg p-6">
          {/* Report Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportTypes.map(type => (
                <div
                  key={type.value}
                  onClick={() => setReportType(type.value)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    reportType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-white">{type.label}</div>
                  <div className="text-sm text-slate-400 mt-1">{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-6" />

          {/* Report Details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Report Name *
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter report description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <hr className="my-6" />

          {/* Filters */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <hr className="my-6" />

          {/* Export Format */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-5 gap-2">
              {exportFormats.map(format => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    exportFormat === format
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-slate-300 hover:bg-gray-200'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 text-slate-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGeneration;