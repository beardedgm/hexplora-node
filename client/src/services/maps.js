import apiClient from './client.js';

let fetchMapController = null;

export async function fetchMaps() {
  const { data } = await apiClient.get('/maps');
  // Support both paginated { maps: [] } and legacy array responses
  return data.maps || data;
}

export async function fetchMap(id) {
  // Cancel any previous in-flight fetchMap request
  if (fetchMapController) {
    fetchMapController.abort();
  }
  fetchMapController = new AbortController();

  try {
    const { data } = await apiClient.get(`/maps/${id}`, {
      signal: fetchMapController.signal,
    });
    return data;
  } finally {
    fetchMapController = null;
  }
}

export async function createMap(mapData) {
  const { data } = await apiClient.post('/maps', mapData);
  return data;
}

export async function updateMap(id, mapData) {
  const { data } = await apiClient.put(`/maps/${id}`, mapData);
  return data;
}

export async function deleteMap(id) {
  const { data } = await apiClient.delete(`/maps/${id}`);
  return data;
}
