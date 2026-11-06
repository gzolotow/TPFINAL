import api from './api';

export async function register({ username, email, password, confirmPassword }) {
  const { data } = await api.post('/auth/register', { username, email, password, confirmPassword });
  return data.user;
}

export async function login({ identifier, password }) {
  const { data } = await api.post('/auth/login', { identifier, password });
  return data.user;
}

export async function logout() {
  await api.post('/auth/logout');
}

// Devuelve el usuario de la sesión o null si no hay sesión válida
export async function getCurrentUser() {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (error) {
    if (error.response?.status === 401) return null;
    throw error;
  }
}
