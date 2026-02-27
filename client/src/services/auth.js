import apiClient from './client.js';

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function register(username, email, password) {
  const { data } = await apiClient.post('/auth/register', { username, email, password });
  return data;
}

export async function getMe(token) {
  const { data } = await apiClient.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function updateProfile(profileData) {
  const { data } = await apiClient.put('/auth/profile', profileData);
  return data;
}
