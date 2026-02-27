import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore.js';
import * as mapsApi from '../services/maps.js';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const linkPatreon = useAuthStore((s) => s.linkPatreon);
  const unlinkPatreon = useAuthStore((s) => s.unlinkPatreon);
  const logout = useAuthStore((s) => s.logout);

  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mapCount, setMapCount] = useState(null);
  const patreonHandled = useRef(false);

  // Handle Patreon callback redirect (?patreon=linked or ?patreon=error)
  useEffect(() => {
    if (patreonHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const patreonStatus = params.get('patreon');
    if (!patreonStatus) return;

    patreonHandled.current = true;
    // Clean URL immediately
    window.history.replaceState({}, '', window.location.pathname);

    if (patreonStatus === 'linked') {
      setMessage('Patreon linked! Refreshing your account...');
      useAuthStore.getState().refreshPatreonStatus()
        .then(() => setMessage('Patreon linked successfully!'))
        .catch(() => setError('Patreon linked but failed to refresh status. Try reloading.'));
    } else if (patreonStatus === 'error') {
      const errorMsg = params.get('message') || 'unknown';
      setError(`Patreon linking failed: ${errorMsg}. Check Render logs for details.`);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      // Fetch map count
      mapsApi.fetchMaps().then((maps) => {
        setMapCount(maps.length);
      }).catch(() => {
        setMapCount(null);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', backgroundColor: '#1a202c' }}>
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleSaveUsername = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim() || username.trim() === (user.username || '')) {
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ username: username.trim() });
      setMessage('Username updated!');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to update username';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkPatreon = async () => {
    if (!confirm('Unlink your Patreon account? Your map limit will revert to 5.')) return;
    try {
      await unlinkPatreon();
      setMessage('Patreon unlinked.');
    } catch {
      setError('Failed to unlink Patreon.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '500px' }}>
        <h1 className="auth-title">Profile</h1>
        <p className="auth-subtitle">Manage your account</p>

        <div className="auth-form">
          {message && <div className="alert alert-success py-2">{message}</div>}
          {error && <div className="alert alert-danger py-2">{error}</div>}

          {/* Username */}
          <form onSubmit={handleSaveUsername}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  title="Letters, numbers, and underscores only"
                  placeholder={user.username ? '' : user.email}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={saving || username.trim() === (user.username || '')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={user.email}
              disabled
            />
          </div>

          <hr style={{ borderColor: '#4a5568' }} />

          {/* Patreon Status */}
          <div className="mb-3">
            <label className="form-label">Membership</label>
            {user.patreonId ? (
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  {user.isPatron ? (
                    <>
                      <span className="badge bg-success" style={{ fontSize: '0.9rem', padding: '0.4rem 0.75rem' }}>Member</span>
                      <span style={{ color: '#e2e8f0' }} className="small">
                        Patreon linked &mdash; {user.mapLimit} map slots
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#cbd5e0' }} className="small">
                      Patreon linked (not an active patron &mdash; {user.mapLimit} map slots)
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleUnlinkPatreon}
                >
                  Unlink Patreon
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#cbd5e0' }} className="small mb-2">
                  Link your Patreon to unlock 25 map slots (free accounts get {user.mapLimit}).
                </p>
                <button className="btn btn-warning btn-sm" onClick={linkPatreon}>
                  Link Patreon
                </button>
              </div>
            )}
          </div>

          {/* Map Usage */}
          <div className="mb-3">
            <label className="form-label">Map Storage</label>
            <div className="d-flex align-items-center gap-2">
              <span style={{ color: '#e2e8f0' }}>
                {mapCount !== null ? `${mapCount} / ${user.mapLimit}` : '...'} maps
              </span>
              {!user.isPatron && mapCount !== null && mapCount >= user.mapLimit && (
                <span className="badge bg-danger">Limit reached</span>
              )}
            </div>
            {!user.isPatron && (
              <div className="small" style={{ color: '#a0aec0', marginTop: '0.25rem' }}>
                Free: {user.mapLimit} maps &middot; Members: 25 maps
              </div>
            )}
          </div>

          <hr style={{ borderColor: '#4a5568' }} />

          {/* Actions */}
          <div className="d-flex justify-content-between">
            <Link to="/" className="btn btn-secondary btn-sm">Back to Map</Link>
            <button className="btn btn-outline-danger btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
