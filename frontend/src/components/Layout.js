import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { 
  Radio, 
  Activity, 
  Settings, 
  FileText, 
  Zap, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  User,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
      description: 'System overview and status'
    },
    {
      name: 'System Status',
      path: '/system-status',
      icon: Activity,
      description: 'Live Argus monitoring'
    },
    {
      name: 'Direct Measurement',
      path: '/direct-measurement',
      icon: Zap,
      description: 'Real-time measurements'
    },
    {
      name: 'Configuration',
      path: '/configuration',
      icon: Settings,
      description: 'System configuration'
    },
    {
      name: 'System Logs',
      path: '/logs',
      icon: FileText,
      description: 'Event logs and history'
    }
  ];

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full glass-card border-r border-slate-700/50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-glow">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ArgusUI</h1>
                <p className="text-xs text-slate-400">Spectrum Control</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300' 
                      : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'
                    }
                    group
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'} transition-colors`} />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-slate-500 group-hover:text-slate-400">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30">
              <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <div className="flex items-center space-x-1">
                  {isAdmin() && <Shield className="w-3 h-3 text-yellow-400" />}
                  <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700/50 glass">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <Radio className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-white">ArgusUI</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="min-h-screen p-4 lg:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
