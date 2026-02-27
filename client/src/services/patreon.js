import apiClient from './client.js';

export async function getPatreonLinkUrl() {
  const { data } = await apiClient.get('/patreon/link');
  return data;
}

export async function unlinkPatreon() {
  const { data } = await apiClient.post('/patreon/unlink');
  return data;
}

export async function getPatreonStatus() {
  const { data } = await apiClient.get('/patreon/status');
  return data;
}
