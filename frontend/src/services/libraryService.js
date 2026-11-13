import api from './api';

export async function getLibrary(params = {}) {
  const { data } = await api.get('/library', { params });
  return data.items;
}

export async function addToLibrary(game, status = 'want_to_play') {
  const { data } = await api.post('/library', { game, status });
  return data.item;
}

// changes: { status?, is_favorite?, rating?, hours_played?, platform? }
export async function updateLibraryItem(gameId, changes) {
  const { data } = await api.patch(`/library/${gameId}`, changes);
  return data.item;
}

export async function removeFromLibrary(gameId) {
  await api.delete(`/library/${gameId}`);
}
