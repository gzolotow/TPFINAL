import api from './api';

// Juegos de la API externa (Steam).
// Steam no permite llamadas directas desde el navegador, así que pasamos por
// nuestro backend (/api/games), que consulta Steam y devuelve los datos ya limpios.

export const PLATFORM_FILTERS = ['Windows', 'Mac', 'Linux'];

export const SORTS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'metacritic', label: 'Metacritic' },
  { value: 'newest', label: 'Más nuevos' },
  { value: 'oldest', label: 'Más viejos' },
  { value: 'name', label: 'Nombre (A-Z)' },
];

// Búsqueda por texto con filtros y orden
export async function searchGames({ search, platform = '', genre = '', sort = 'relevance' }) {
  const params = { q: search.trim(), sort };
  if (platform) params.platform = platform;
  if (genre) params.genre = genre;
  const { data } = await api.get('/games/search', { params, timeout: 30000 });
  return data.games;
}

// Más vendidos y novedades de la tienda
export async function getFeaturedGames() {
  const { data } = await api.get('/games/featured', { timeout: 30000 });
  return data.games;
}

// Detalle completo (descripción, capturas, desarrolladores, precio)
export async function getGameDetail(id) {
  const { data } = await api.get(`/games/${id}`, { timeout: 30000 });
  return data.game;
}

// Deja solo los campos que guarda nuestro backend en la biblioteca y colecciones
export function toGamePayload(game) {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    cover_url: game.cover_url,
    released: game.released,
    genres: game.genres,
    platforms: game.platforms,
    metacritic: game.metacritic,
  };
}
