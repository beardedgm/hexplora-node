import apiClient from './client.js';

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function register(email, password) {
  const { data } = await apiClient.post('/auth/register', { email, password });
  return data;
}

export async function getMe(token) {
  const { data } = await apiClient.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
