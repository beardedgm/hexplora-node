import { create } from 'zustand';
import * as authApi from '../services/auth.js';
import * as patreonApi from '../services/patreon.js';

const TOKEN_KEY = 'hexplora_token';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: false,
  loading: true,

  // Initialize — check if stored token is valid
  init: async () => {
    const token = get().token;
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const user = await authApi.getMe(token);
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data;
  },

  register: async (email, password) => {
    const data = await authApi.register(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  // Patreon
  linkPatreon: async () => {
    const data = await patreonApi.getPatreonLinkUrl();
    window.location.href = data.url;
  },

  unlinkPatreon: async () => {
    await patreonApi.unlinkPatreon();
    set((state) => ({
      user: state.user ? { ...state.user, isPatron: false, patreonId: null, mapLimit: 5 } : null,
    }));
  },

  refreshPatreonStatus: async () => {
    const status = await patreonApi.getPatreonStatus();
    set((state) => ({
      user: state.user ? { ...state.user, ...status } : null,
    }));
  },
}));

export default useAuthStore;
