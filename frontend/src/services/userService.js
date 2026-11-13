import api from './api';

// Perfil, actividad y estadísticas del usuario autenticado

export async function getProfile() {
  const { data } = await api.get('/profile');
  return data; // { user, counts }
}

export async function updateProfile(changes) {
  const { data } = await api.patch('/profile', changes);
  return data.user;
}

export async function getActivity(limit = 20) {
  const { data } = await api.get('/activity', { params: { limit } });
  return data.activity;
}

export async function getStats(year) {
  const { data } = await api.get('/stats', { params: year ? { year } : {} });
  return data;
}
