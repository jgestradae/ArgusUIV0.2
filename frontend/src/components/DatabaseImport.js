import React, { useState, useEffect } from 'react';
import { AlertCircle, Database, Radio, MapPin, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DatabaseImport = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  
  // State for form
  const [resultType, setResultType] = useState('transmitters');
  const [listName, setListName] = useState('');
  const [includeBandwidth, setIncludeBandwidth] = useState(false);
  
  // Frequency params
  const [freqMode, setFreqMode] = useState('N');
  const [singleFreq, setSingleFreq] = useState('');
  const [freqRangeLow, setFreqRangeLow] = useState('');
  const [freqRangeHigh, setFreqRangeHigh] = useState('');
  const [freqList, setFreqList] = useState([]);
  const [freqListInput, setFreqListInput] = useState('');
  
  // Location params
  const [locMode, setLocMode] = useState('N');
  const [country, setCountry] = useState('');
  const [longitudeDeg, setLongitudeDeg] = useState('');
  const [longitudeMin, setLongitudeMin] = useState('');
  const [longitudeSec, setLongitudeSec] = useState('');
  const [longitudeHem, setLongitudeHem] = useState('W');
  const [latitudeDeg, setLatitudeDeg] = useState('');
  const [latitudeMin, setLatitudeMin] = useState('');
  const [latitudeSec, setLatitudeSec] = useState('');
  const [latitudeHem, setLatitudeHem] = useState('N');
  const [radius, setRadius] = useState('');
  
  // Optional search criteria
  const [service, setService] = useState('');
  const [signature, setSignature] = useState('');
  const [callSign, setCallSign] = useState('');
  const [licensee, setLicensee] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [systemName, setSystemName] = useState('');
  
  // Options
  const [databaseSelection, setDatabaseSelection] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Common service types
  const serviceTypes = [
    { value: 'BC', label: 'Broadcasting (BC)' },
    { value: 'FM', label: 'FM Radio (FM)' },
    { value: 'AM', label: 'AM Radio (AM)' },
    { value: 'TV', label: 'Television (TV)' },
    { value: 'MB', label: 'Mobile (MB)' },
    { value: 'FX', label: 'Fixed (FX)' },
    { value: 'AR', label: 'Aeronautical (AR)' },
    { value: 'MR', label: 'Maritime (MR)' }
  ];

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const frequencyParams = {
        mode: freqMode
      };
      
      if (freqMode === 'S') {
        if (!singleFreq) {
          toast.error('Please enter a single frequency');
          setLoading(false);
          return;
        }
        frequencyParams.single_freq = parseFloat(singleFreq) * 1e6; // Convert MHz to Hz
      } else if (freqMode === 'R') {
        if (!freqRangeLow || !freqRangeHigh) {
          toast.error('Please enter both lower and upper frequency limits');
          setLoading(false);
          return;
        }
        frequencyParams.range_lower = parseFloat(freqRangeLow) * 1e6;
        frequencyParams.range_upper = parseFloat(freqRangeHigh) * 1e6;
      } else if (freqMode === 'L') {
        if (freqList.length === 0) {
          toast.error('Please add at least one frequency to the list');
          setLoading(false);
          return;
        }
        frequencyParams.freq_list = freqList.map(f => f * 1e6);
      }
      
      const locationParams = {
        mode: locMode
      };
      
      if (locMode === 'C') {
        if (!country) {
          toast.error('Please enter a country code');
          setLoading(false);
          return;
        }
        locationParams.country = country;
      } else if (locMode === 'COORD') {
        if (!longitudeDeg || !longitudeMin || !longitudeSec || !latitudeDeg || !latitudeMin || !latitudeSec) {
          toast.error('Please enter complete coordinates');
          setLoading(false);
          return;
        }
        locationParams.longitude_deg = parseInt(longitudeDeg);
        locationParams.longitude_min = parseInt(longitudeMin);
        locationParams.longitude_sec = parseFloat(longitudeSec);
        locationParams.longitude_hem = longitudeHem;
        locationParams.latitude_deg = parseInt(latitudeDeg);
        locationParams.latitude_min = parseInt(latitudeMin);
        locationParams.latitude_sec = parseFloat(latitudeSec);
        locationParams.latitude_hem = latitudeHem;
        
        if (radius) {
          locationParams.radius = parseFloat(radius);
        }
      }
      
      const additionalParams = {};
      if (service) additionalParams.service = service;
      if (signature) additionalParams.signature = signature;
      if (callSign) additionalParams.call_sign = callSign;
      if (licensee) additionalParams.licensee = licensee;
      if (licenseState) additionalParams.license_state = licenseState;
      if (systemName) additionalParams.system_name = systemName;
      
      const queryRequest = {
        query_type: resultType === 'transmitters' ? 'ITL' : 'IFL',
        result_option: resultType,
        include_bandwidth: includeBandwidth,
        list_name: listName || null,
        frequency_params: frequencyParams,
        location_params: locationParams,
        additional_params: additionalParams,
        database_selection: databaseSelection || null,
        auto_update: autoUpdate
      };
      
      // Determine endpoint based on result type
      const endpoint = resultType === 'transmitters' 
        ? `${backendUrl}/api/smdi/query-transmitters`
        : `${backendUrl}/api/smdi/query-frequencies`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(queryRequest)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Query sent successfully! Order ID: ${data.order_id}`);
        toast.info('Results will appear in Data Navigator once processed');
      } else {
        toast.error(data.detail || 'Failed to send query');
      }
      
    } catch (error) {
      console.error('Error sending SMDI query:', error);
      toast.error('Failed to send query');
    } finally {
      setLoading(false);
    }
  };

  const addFrequencyToList = () => {
    if (freqListInput) {
      const freq = parseFloat(freqListInput);
      if (!isNaN(freq)) {
        setFreqList([...freqList, freq]);
        setFreqListInput('');
      }
    }
  };

  const removeFrequencyFromList = (index) => {
    setFreqList(freqList.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Database Import</h1>
          </div>
          <p className="text-gray-600">
            Import frequency lists and transmitter data from external spectrum management databases using SMDI protocol
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Result Type Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Result Type</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={resultType === 'transmitters'}
                  onChange={() => setResultType('transmitters')}
                  className="w-4 h-4"
                />
                <span>Transmitter List</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={resultType === 'occupied_freq'}
                  onChange={() => setResultType('occupied_freq')}
                  className="w-4 h-4"
                />
                <span>Occupied Frequency List</span>
                <label className="flex items-center gap-2 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBandwidth}
                    onChange={(e) => setIncludeBandwidth(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">Include bandwidth</span>
                </label>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={resultType === 'unassigned_freq'}
                  onChange={() => setResultType('unassigned_freq')}
                  className="w-4 h-4"
                />
                <span>Unassigned Frequency List</span>
              </label>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter a name for this list"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <hr className="my-6" />

          {/* Frequency Parameters */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Frequency Parameters
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={freqMode === 'N'}
                  onChange={() => setFreqMode('N')}
                  className="w-4 h-4"
                />
                <span>No restriction</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={freqMode === 'S'}
                  onChange={() => setFreqMode('S')}
                  className="w-4 h-4"
                />
                <span>Single Frequency</span>
              </label>
              {freqMode === 'S' && (
                <div className="ml-6 flex items-center gap-2">
                  <input
                    type="number"
                    value={singleFreq}
                    onChange={(e) => setSingleFreq(e.target.value)}
                    placeholder="88.000000"
                    step="0.000001"
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">MHz</span>
                </div>
              )}
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={freqMode === 'R'}
                  onChange={() => setFreqMode('R')}
                  className="w-4 h-4"
                />
                <span>Frequency Range</span>
              </label>
              {freqMode === 'R' && (
                <div className="ml-6 flex items-center gap-2">
                  <input
                    type="number"
                    value={freqRangeLow}
                    onChange={(e) => setFreqRangeLow(e.target.value)}
                    placeholder="88.000000"
                    step="0.000001"
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">MHz</span>
                  <span className="text-gray-600">-</span>
                  <input
                    type="number"
                    value={freqRangeHigh}
                    onChange={(e) => setFreqRangeHigh(e.target.value)}
                    placeholder="108.000000"
                    step="0.000001"
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">MHz</span>
                </div>
              )}
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={freqMode === 'L'}
                  onChange={() => setFreqMode('L')}
                  className="w-4 h-4"
                />
                <span>Frequency List</span>
              </label>
              {freqMode === 'L' && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={freqListInput}
                      onChange={(e) => setFreqListInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFrequencyToList()}
                      placeholder="Enter frequency in MHz"
                      step="0.000001"
                      className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addFrequencyToList}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  {freqList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {freqList.map((freq, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                        >
                          {freq} MHz
                          <button
                            onClick={() => removeFrequencyFromList(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="my-6" />

          {/* Location Parameters */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Parameters
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={locMode === 'N'}
                  onChange={() => setLocMode('N')}
                  className="w-4 h-4"
                />
                <span>No restriction</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={locMode === 'C'}
                  onChange={() => setLocMode('C')}
                  className="w-4 h-4"
                />
                <span>Country Code</span>
              </label>
              {locMode === 'C' && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    placeholder="e.g., CTR, USA"
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={locMode === 'COORD'}
                  onChange={() => setLocMode('COORD')}
                  className="w-4 h-4"
                />
                <span>Coordinates</span>
              </label>
              {locMode === 'COORD' && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-gray-700 font-medium">Longitude:</span>
                    <input
                      type="number"
                      value={longitudeDeg}
                      onChange={(e) => setLongitudeDeg(e.target.value)}
                      placeholder="74"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>°</span>
                    <input
                      type="number"
                      value={longitudeMin}
                      onChange={(e) => setLongitudeMin(e.target.value)}
                      placeholder="48"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>'</span>
                    <input
                      type="number"
                      value={longitudeSec}
                      onChange={(e) => setLongitudeSec(e.target.value)}
                      placeholder="46.9"
                      step="0.1"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>"</span>
                    <select
                      value={longitudeHem}
                      onChange={(e) => setLongitudeHem(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="W">W</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-gray-700 font-medium">Latitude:</span>
                    <input
                      type="number"
                      value={latitudeDeg}
                      onChange={(e) => setLatitudeDeg(e.target.value)}
                      placeholder="10"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>°</span>
                    <input
                      type="number"
                      value={latitudeMin}
                      onChange={(e) => setLatitudeMin(e.target.value)}
                      placeholder="59"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>'</span>
                    <input
                      type="number"
                      value={latitudeSec}
                      onChange={(e) => setLatitudeSec(e.target.value)}
                      placeholder="8.8"
                      step="0.1"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span>"</span>
                    <select
                      value={latitudeHem}
                      onChange={(e) => setLatitudeHem(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="N">N</option>
                      <option value="S">S</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-gray-700 font-medium">Radius:</span>
                    <input
                      type="number"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      placeholder="30"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-600">km</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="my-6" />

          {/* Optional Search Criteria */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Optional Search Criteria
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select service...</option>
                  {serviceTypes.map(st => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signature
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Sign
                </label>
                <input
                  type="text"
                  value={callSign}
                  onChange={(e) => setCallSign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Licensee
                </label>
                <input
                  type="text"
                  value={licensee}
                  onChange={(e) => setLicensee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License State
                </label>
                <input
                  type="text"
                  value={licenseState}
                  onChange={(e) => setLicenseState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Name
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <hr className="my-6" />

          {/* Options */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Options</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Selection
                </label>
                <select
                  value={databaseSelection}
                  onChange={(e) => setDatabaseSelection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{'<None>'}</option>
                  <option value="primary">Primary Database</option>
                  <option value="secondary">Secondary Database</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoUpdate}
                    onChange={(e) => setAutoUpdate(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Automatic Update</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Query...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Submit Query
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseImport;
