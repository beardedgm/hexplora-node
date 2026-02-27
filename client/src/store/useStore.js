import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import { DEFAULTS } from '../state/defaults.js';

// Create a vanilla (non-React) store so it can be used both inside and outside React
const store = createStore(() => ({
  ...DEFAULTS,
}));

// React hook for components
const useStore = (selector) => useZustandStore(store, selector);

// Imperative API for canvas/input code (works outside React)
// These mirror the old Store class interface for easier migration
export const storeApi = {
  get: (key) => store.getState()[key],
  getAll: () => store.getState(),
  set: (key, value) => store.setState({ [key]: value }),
  update: (changes) => store.setState(changes),
  getState: () => store.getState(),
  setState: (partial) => store.setState(partial),
  subscribe: store.subscribe,

  // Backward-compatible `on(key, cb)` — subscribes to changes for a specific key
  on: (key, callback) => {
    return store.subscribe((state, prevState) => {
      if (state[key] !== prevState[key]) {
        callback(state[key], prevState[key], key);
      }
    });
  },
};

export default useStore;
