export class Store {
    constructor(initialState) {
        this._state = { ...initialState };
        this._listeners = new Map();
        this._globalListeners = new Set();
    }

    get(key) {
        return this._state[key];
    }

    getAll() {
        return { ...this._state };
    }

    set(key, value) {
        const old = this._state[key];
        this._state[key] = value;
        const keyListeners = this._listeners.get(key);
        if (keyListeners) {
            for (const cb of keyListeners) cb(value, old, key);
        }
        for (const cb of this._globalListeners) cb(key, value, old);
    }

    update(changes) {
        for (const [key, value] of Object.entries(changes)) {
            this.set(key, value);
        }
    }

    on(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);
        return () => this._listeners.get(key).delete(callback);
    }

    onAny(callback) {
        this._globalListeners.add(callback);
        return () => this._globalListeners.delete(callback);
    }
}
