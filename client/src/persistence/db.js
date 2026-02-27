export function openDatabase() {
    if (openDatabase.dbPromise) return openDatabase.dbPromise;
    openDatabase.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open('hexplora', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('maps')) {
                const store = db.createObjectStore('maps', { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('updated', 'updated', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return openDatabase.dbPromise;
}

async function withStore(type, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('maps', type);
        const store = tx.objectStore('maps');

        let request;
        try {
            request = callback(store);
        } catch (err) {
            reject(err);
            return;
        }

        const reqPromise =
            request && typeof request === 'object' && 'onsuccess' in request
                ? new Promise((res, rej) => {
                      request.onsuccess = () => res(request.result);
                      request.onerror = () => rej(request.error);
                  })
                : Promise.resolve(request);

        tx.oncomplete = () => {
            reqPromise.then(resolve).catch(reject);
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

export async function saveMap({ name, blob, state, updated = Date.now() }) {
    const id = crypto.randomUUID();
    await withStore('readwrite', store => store.put({ id, name, blob, state, updated }));
    return id;
}

export async function updateMap(id, { name, blob, state, updated = Date.now() }) {
    await withStore('readwrite', store => store.put({ id, name, blob, state, updated }));
}

export async function getMap(id) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('maps', 'readonly');
        const req = tx.objectStore('maps').get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function getAllMaps() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('maps', 'readonly');
        const req = tx.objectStore('maps').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteMap(id) {
    await withStore('readwrite', store => store.delete(id));
}

export async function renameMap(id, newName) {
    await withStore('readwrite', store => {
        const req = store.get(id);
        req.onsuccess = () => {
            const data = req.result;
            if (data) {
                data.name = newName;
                data.updated = Date.now();
                store.put(data);
            }
        };
        return req;
    });
}

export async function updateMapState(id, state) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('maps', 'readwrite');
        const objStore = tx.objectStore('maps');
        const req = objStore.get(id);
        req.onsuccess = () => {
            const data = req.result;
            if (data) {
                data.state = state;
                data.updated = Date.now();
                objStore.put(data);
            }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
