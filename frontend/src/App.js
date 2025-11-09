import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SystemStatus from './components/SystemStatus';
import SystemParameters from './components/SystemParameters';
import DirectMeasurement from './components/DirectMeasurement';
import DirectMeasurementADC from './components/DirectMeasurementADC';
import AutomaticMode from './components/AutomaticMode';
import Configuration from './components/Configuration';
import SystemLogs from './components/SystemLogs';
import DataNavigator from './components/DataNavigator';
import DatabaseImport from './components/DatabaseImport';
import ReportGeneration from './components/ReportGeneration';
import ReportList from './components/ReportList';
import GeolocationMap from './components/GeolocationMap';
import AMMCalendarView from './components/AMMCalendarView';
import AccessibilityStatement from './components/AccessibilityStatement';
import ADConfiguration from './components/ADConfiguration';
import LocationMeasurementResults from './components/LocationMeasurementResults';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import 'leaflet/dist/leaflet.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/system-status" element={
              <ProtectedRoute>
                <Layout>
                  <SystemStatus />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/system-parameters" element={
              <ProtectedRoute>
                <Layout>
                  <SystemParameters />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/direct-measurement" element={
              <ProtectedRoute>
                <Layout>
                  <DirectMeasurementADC />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/automatic-mode" element={
              <ProtectedRoute>
                <Layout>
                  <AutomaticMode />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/automatic-calendar" element={
              <ProtectedRoute>
                <Layout>
                  <AMMCalendarView />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/data-navigator" element={
              <ProtectedRoute>
                <Layout>
                  <DataNavigator />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/database-import" element={
              <ProtectedRoute>
                <Layout>
                  <DatabaseImport />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports/generate" element={
              <ProtectedRoute>
                <Layout>
                  <ReportGeneration />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports/list" element={
              <ProtectedRoute>
                <Layout>
                  <ReportList />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/configuration" element={
              <ProtectedRoute>
                <Layout>
                  <Configuration />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/logs" element={
              <ProtectedRoute>
                <Layout>
                  <SystemLogs />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/geolocation" element={
              <ProtectedRoute>
                <Layout>
                  <GeolocationMap />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/geolocation/ala/:measurementId" element={
              <ProtectedRoute>
                <Layout>
                  <GeolocationMap mode="ALA" />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/geolocation/tdoa/:measurementId" element={
              <ProtectedRoute>
                <Layout>
                  <GeolocationMap mode="TDOA" />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/accessibility-statement" element={
              <AccessibilityStatement />
            } />
            <Route path="/ad-configuration" element={
              <ProtectedRoute>
                <Layout>
                  <ADConfiguration />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
