import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Radio, Shield, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (result.success) {
      toast.success('Welcome to ArgusUI', {
        description: 'Successfully logged into the spectrum monitoring system'
      });
    } else {
      setError(result.error);
      toast.error('Login Failed', {
        description: result.error
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      
      <Card className="w-full max-w-md glass-card border-0 shadow-2xl animate-fade-in relative z-10">
        <CardHeader className="text-center space-y-6">
          {/* Logo and branding */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center animate-glow">
                <Radio className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Shield className="w-6 h-6 text-green-400 animate-pulse" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              ArgusUI
            </CardTitle>
            <CardDescription className="text-slate-400 text-lg">
              Spectrum Monitoring Control System
            </CardDescription>
          </div>
          
          {/* System status indicator */}
          <div className="flex items-center justify-center space-x-2 text-sm text-slate-300">
            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
            <span>System Online</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10 animate-slide-in">
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Username</label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-spectrum h-11"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-spectrum h-11"
                required
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full btn-spectrum h-11 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="spinner"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Access System'
              )}
            </Button>
          </form>
          
          {/* Demo credentials info */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Demo Access</h4>
            <p className="text-xs text-slate-400 mb-2">Default credentials:</p>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Username:</span>
                <span className="text-blue-300">admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Password:</span>
                <span className="text-blue-300">admin123</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
