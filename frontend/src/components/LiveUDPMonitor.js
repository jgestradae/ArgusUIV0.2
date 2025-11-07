import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Activity,
  Play,
  Square,
  Download,
  Radio,
  BarChart3,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { toast } from 'sonner';

const Plot = createPlotlyComponent(Plotly);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LiveUDPMonitor() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('inactive');
  const [capturedData, setCapturedData] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [recentCaptures, setRecentCaptures] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    checkCaptureStatus();
    loadRecentCaptures();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const checkCaptureStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/adc/capture/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCaptureStatus(data.status);
      setIsCapturing(data.is_listening);
      
      // Connect WebSocket if capture is active
      if (data.is_listening && !wsRef.current) {
        connectWebSocket();
      }
    } catch (error) {
      console.error('Error checking capture status:', error);
    }
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/api/adc/ws/stream`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        toast.success('Connected to live data stream');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.event === 'connected') {
            console.log('WebSocket handshake complete');
          } else if (message.event === 'capture.received') {
            handleCaptureReceived(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket connection error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  };

  const handleCaptureReceived = (captureData) => {
    // Add to captured data list
    setCapturedData(prev => [captureData, ...prev].slice(0, 100)); // Keep last 100
    
    // Update live data for visualization
    if (captureData.parsed) {
      setLiveData(captureData.parsed);
    }
  };

  const startCapture = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/adc/capture/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsCapturing(true);
        setCaptureStatus('active');
        connectWebSocket();
        toast.success('UDP capture started');
      } else {
        toast.error('Failed to start capture');
      }
    } catch (error) {
      console.error('Error starting capture:', error);
      toast.error('Failed to start capture');
    }
  };

  const stopCapture = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/adc/capture/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsCapturing(false);
        setCaptureStatus('inactive');
        
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        
        toast.success('UDP capture stopped');
      } else {
        toast.error('Failed to stop capture');
      }
    } catch (error) {
      console.error('Error stopping capture:', error);
      toast.error('Failed to stop capture');
    }
  };

  const loadRecentCaptures = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/adc/captures?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setRecentCaptures(data.captures);
      }
    } catch (error) {
      console.error('Error loading recent captures:', error);
    }
  };

  const exportCapturedData = () => {
    const dataStr = JSON.stringify(capturedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adc_captures_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Captured data exported');
  };

  const renderSpectrumGraph = () => {
    if (!liveData || liveData.type !== 'binary' || liveData.format !== 'spectrum') {
      return <div className="text-center text-gray-400 py-8">No spectrum data available</div>;
    }

    const frequencies = liveData.levels.map((_, idx) => 
      (liveData.frequency_start + idx * liveData.frequency_step) / 1e6
    );

    return (
      <Plot
        data={[{
          x: frequencies,
          y: liveData.levels,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#10b981', width: 1 },
          fill: 'tozeroy',
          fillcolor: 'rgba(16, 185, 129, 0.2)'
        }]}
        layout={{
          title: 'Live Spectrum',
          xaxis: { 
            title: 'Frequency (MHz)',
            gridcolor: '#374151',
            color: '#9ca3af'
          },
          yaxis: { 
            title: 'Level (dBμV)',
            gridcolor: '#374151',
            color: '#9ca3af'
          },
          paper_bgcolor: '#1f2937',
          plot_bgcolor: '#111827',
          font: { color: '#9ca3af' },
          margin: { t: 40, r: 20, b: 40, l: 50 },
          autosize: true
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '400px' }}
      />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="h-8 w-8 text-emerald-500" />
            Live UDP Monitor
          </h1>
          <p className="text-gray-400 mt-1">Real-time ADC data capture from Argus (UDP port 4090)</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isCapturing ? 'default' : 'secondary'} className="flex items-center gap-1">
            {isCapturing ? (
              <>
                <Wifi className="h-3 w-3" />
                Capturing
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Stopped
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Capture Control
          </CardTitle>
          <CardDescription>Start or stop UDP data capture on port 4090</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {!isCapturing ? (
              <Button onClick={startCapture} className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="mr-2 h-4 w-4" />
                Start UDP Capture
              </Button>
            ) : (
              <Button onClick={stopCapture} variant="destructive">
                <Square className="mr-2 h-4 w-4" />
                Stop Capture
              </Button>
            )}
            
            <Button 
              onClick={exportCapturedData} 
              variant="outline" 
              disabled={capturedData.length === 0}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data ({capturedData.length})
            </Button>
            
            <Button 
              onClick={loadRecentCaptures}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Data Display */}
      <Tabs defaultValue="graph" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="graph" className="data-[state=active]:bg-gray-700">
            <BarChart3 className="mr-2 h-4 w-4" />
            Graph View
          </TabsTrigger>
          <TabsTrigger value="text" className="data-[state=active]:bg-gray-700">
            <FileText className="mr-2 h-4 w-4" />
            Text View
          </TabsTrigger>
          <TabsTrigger value="recent" className="data-[state=active]:bg-gray-700">
            <Activity className="mr-2 h-4 w-4" />
            Recent Captures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Live Spectrum Display</CardTitle>
              <CardDescription>Real-time visualization of captured spectrum data</CardDescription>
            </CardHeader>
            <CardContent>
              {renderSpectrumGraph()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Raw Data Stream</CardTitle>
              <CardDescription>Decoded measurement results</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
                {capturedData.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No data captured yet. Start capture to see live results.
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-sm">
                    {capturedData.map((capture, idx) => (
                      <div key={idx} className="border-b border-gray-700 pb-2">
                        <div className="text-emerald-400">
                          [{new Date(capture.timestamp).toLocaleTimeString()}] Capture ID: {capture.capture_id}
                        </div>
                        <div className="text-gray-300">
                          Source: {capture.addr[0]}:{capture.addr[1]} | Size: {capture.size_bytes} bytes
                        </div>
                        {capture.parsed && (
                          <div className="text-gray-400 pl-4">
                            Type: {capture.parsed.type} | Format: {capture.parsed.format}
                            {capture.parsed.num_points && (
                              <> | Points: {capture.parsed.num_points}</>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Captures</CardTitle>
              <CardDescription>Historical UDP captures from database</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {recentCaptures.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No captures in database yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentCaptures.map((capture, idx) => (
                      <div key={idx} className="p-3 border border-gray-700 rounded-lg bg-gray-900">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-white">
                              Capture ID: {capture.id}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(capture.timestamp).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              Source: {capture.source_addr}:{capture.source_port} | {capture.size_bytes} bytes
                            </div>
                          </div>
                          <Badge variant={capture.parsed ? 'default' : 'secondary'}>
                            {capture.data_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
