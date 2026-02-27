import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from './store/useAuthStore.js';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MapPage from './pages/MapPage.jsx';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const run = async () => {
      await init();

      // Check for Patreon callback after auth is initialized
      const params = new URLSearchParams(window.location.search);
      const patreonStatus = params.get('patreon');
      if (patreonStatus === 'linked') {
        await useAuthStore.getState().refreshPatreonStatus();
        window.history.replaceState({}, '', window.location.pathname);
      } else if (patreonStatus === 'error') {
        console.error('Patreon linking failed:', params.get('message'));
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    run();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/*" element={<MapPage />} />
    </Routes>
  );
}
