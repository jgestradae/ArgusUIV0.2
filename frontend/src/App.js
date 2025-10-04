import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SystemStatus from './components/SystemStatus';
import DirectMeasurement from './components/DirectMeasurement';
import AutomaticMode from './components/AutomaticMode';
import Configuration from './components/Configuration';
import SystemLogs from './components/SystemLogs';
import DataNavigator from './components/DataNavigator';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

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
            <Route path="/direct-measurement" element={
              <ProtectedRoute>
                <Layout>
                  <DirectMeasurement />
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
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
