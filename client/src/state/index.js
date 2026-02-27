// Compatibility shim — re-exports the Zustand store API with the same interface
// as the old custom Store class so all imperative code works unchanged.
import { storeApi } from '../store/useStore.js';

export const store = storeApi;
