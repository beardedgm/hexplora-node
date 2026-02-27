import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MapPage from './pages/MapPage.jsx';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', backgroundColor: '#1a202c' }}>
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();

    // Check for Patreon callback
    const params = new URLSearchParams(window.location.search);
    const patreonStatus = params.get('patreon');
    if (patreonStatus === 'linked') {
      useAuthStore.getState().refreshPatreonStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (patreonStatus === 'error') {
      console.error('Patreon linking failed:', params.get('message'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
