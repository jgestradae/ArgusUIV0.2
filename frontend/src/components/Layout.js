import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
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
  Shield,
  Database,
  Clock,
  Map,
  MapPin,
  Server,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import AccessibilityToolbar from './AccessibilityToolbar';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      nameKey: 'navigation.dashboard',
      descKey: 'navigation.dashboard_desc',
      path: '/dashboard',
      icon: BarChart3
    },
    {
      nameKey: 'navigation.system_status',
      descKey: 'navigation.system_status_desc',
      path: '/system-status',
      icon: Activity
    },
    {
      nameKey: 'navigation.system_parameters',
      descKey: 'navigation.system_parameters_desc',
      path: '/system-parameters',
      icon: Server
    },
    {
      nameKey: 'navigation.geolocation',
      descKey: 'navigation.geolocation_desc',
      path: '/geolocation',
      icon: Map
    },
    {
      nameKey: 'navigation.location_results',
      descKey: 'navigation.location_results_desc',
      path: '/location-results',
      icon: MapPin
    },
    {
      nameKey: 'navigation.direct_measurement',
      descKey: 'navigation.direct_measurement_desc',
      path: '/direct-measurement',
      icon: Zap
    },
    {
      nameKey: 'navigation.automatic_mode',
      descKey: 'navigation.automatic_mode_desc',
      path: '/automatic-mode',
      icon: Clock
    },
    {
      nameKey: 'navigation.data_navigator',
      descKey: 'navigation.data_navigator_desc',
      path: '/data-navigator',
      icon: Database
    },
    {
      nameKey: 'navigation.database_import',
      descKey: 'navigation.database_import_desc',
      path: '/database-import',
      icon: Download
    },
    {
      nameKey: 'navigation.reports',
      descKey: 'navigation.reports_desc',
      path: '/reports/list',
      icon: FileText
    },
    {
      nameKey: 'navigation.configuration',
      descKey: 'navigation.configuration_desc',
      path: '/configuration',
      icon: Settings
    },
    {
      nameKey: 'navigation.system_logs',
      descKey: 'navigation.system_logs_desc',
      path: '/logs',
      icon: FileText
    },
    {
      nameKey: 'navigation.ad_configuration',
      descKey: 'navigation.ad_configuration_desc',
      path: '/ad-configuration',
      icon: Shield,
      adminOnly: true
    }
  ];

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <>
      {/* Accessibility Toolbar */}
      <AccessibilityToolbar />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" style={{ paddingTop: '3rem' }}>
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ top: '3rem' }}
          role="navigation"
          aria-label={t('accessibility.menu')}
        >
          <div className="flex flex-col h-full glass-card border-r border-slate-700/50">
            {/* Header */}
            <header className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center animate-glow" aria-hidden="true">
                  <Radio className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{t('app.name')}</h1>
                  <p className="text-xs text-slate-400">{t('app.description')}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label={t('accessibility.close_menu')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </Button>
            </header>

            {/* Navigation */}
            <nav 
              className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden" 
              role="navigation" 
              aria-label="Main navigation"
              style={{
                maxHeight: 'calc(100vh - 14rem)',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(148, 163, 184, 0.5) transparent'
              }}
            >
              {navigationItems
                .filter(item => !item.adminOnly || (user && user.role === 'admin'))
                .map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                const itemName = t(item.nameKey);
                const itemDesc = t(item.descKey);
                
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
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`${itemName}: ${itemDesc}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'} transition-colors`} aria-hidden="true" />
                    <div className="flex-1">
                      <div className="font-medium">{itemName}</div>
                      <div className="text-xs text-slate-500 group-hover:text-slate-400">{itemDesc}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* User info and logout */}
            <footer className="p-4 border-t border-slate-700/50">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30">
                <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center" aria-hidden="true">
                  <User className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                  <div className="flex items-center space-x-1">
                    {isAdmin() && <Shield className="w-3 h-3 text-yellow-400" aria-label="Administrator" />}
                    <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400"
                  aria-label={t('auth.logout')}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </footer>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-72">
          {/* Mobile header */}
          <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700/50 glass" role="banner">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('accessibility.open_menu')}
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </Button>
            <div className="flex items-center space-x-2">
              <Radio className="w-6 h-6 text-blue-400" aria-hidden="true" />
              <span className="font-bold text-white">{t('app.name')}</span>
            </div>
            <div className="w-10" aria-hidden="true" />
          </header>

          {/* Page content */}
          <main id="main-content" className="p-6" role="main" tabIndex="-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="p-6 border-t border-slate-700/50 mt-12 glass-card" role="contentinfo">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <img src="/ane-logo.svg" alt="ANE Logo" className="h-10" onError={(e) => e.target.style.display = 'none'} />
                  <div>
                    <p className="text-sm font-semibold text-white">{t('app.footer.organization')}</p>
                    <p className="text-xs text-slate-400">{t('app.footer.rights')} © 2025</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <Link to="/accessibility-statement" className="text-slate-300 hover:text-blue-400 transition-colors">
                    {t('app.footer.accessibility')}
                  </Link>
                  <span className="text-slate-500">{t('app.footer.version', { version: t('app.version') })}</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
