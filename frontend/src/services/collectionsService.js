import api from './api';

export async function getCollections() {
  const { data } = await api.get('/collections');
  return data.collections;
}

export async function getCollection(id) {
  const { data } = await api.get(`/collections/${id}`);
  return data.collection;
}

export async function createCollection({ name, description }) {
  const { data } = await api.post('/collections', { name, description });
  return data.collection;
}

export async function updateCollection(id, changes) {
  const { data } = await api.patch(`/collections/${id}`, changes);
  return data.collection;
}

export async function deleteCollection(id) {
  await api.delete(`/collections/${id}`);
}

export async function addGameToCollection(collectionId, game) {
  await api.post(`/collections/${collectionId}/games`, { game });
}

export async function removeGameFromCollection(collectionId, gameId) {
  await api.delete(`/collections/${collectionId}/games/${gameId}`);
}
