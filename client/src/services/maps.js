import apiClient from './client.js';

export async function fetchMaps() {
  const { data } = await apiClient.get('/maps');
  return data;
}

export async function fetchMap(id) {
  const { data } = await apiClient.get(`/maps/${id}`);
  return data;
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
