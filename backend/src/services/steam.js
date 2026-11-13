// Cliente de la API pública de la tienda de Steam (no necesita API key).
// La llamamos desde el backend porque Steam no permite llamadas directas desde
// el navegador (no tiene CORS). El backend hace de intermediario y además
// guarda las respuestas un rato en memoria para no repetir pedidos.
import { HttpError } from '../utils/httpError.js';

const STORE = 'https://store.steampowered.com/api';
const LANG = 'l=spanish&cc=AR';
const DETAILS_TTL = 6 * 60 * 60 * 1000; // 6 horas
const LIST_TTL = 30 * 60 * 1000; // 30 minutos

// ---------- Caché simple en memoria ----------
const cache = new Map();
async function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + ttl });
  if (cache.size > 2000) cache.delete(cache.keys().next().value); // que no crezca sin límite
  return value;
}

async function steamJson(path) {
  let response;
  try {
    response = await fetch(`${STORE}${path}`, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new HttpError(502, 'No se pudo conectar con Steam');
  }
  if (response.status === 429) throw new HttpError(503, 'Steam está limitando las consultas, probá en un minuto');
  if (!response.ok) throw new HttpError(502, 'Steam respondió con un error');
  return response.json();
}

// ---------- Fechas: Steam las da como texto ("24 FEB 2017", "24 Feb, 2017", "4 ene. 2021") ----------
const MONTHS = {
  jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7,
  aug: 8, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dec: 12, dic: 12,
};
export function parseSteamDate(text) {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/[.,]/g, ' ');
  const year = clean.match(/\b(19|20)\d{2}\b/)?.[0];
  const monthWord = clean.match(/[a-záéíóú]{3,}/)?.[0];
  const month = monthWord ? MONTHS[monthWord.slice(0, 3)] : null;
  const day = clean.match(/\b\d{1,2}\b/)?.[0];
  if (!year || !month) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day ?? 1)}`;
}

// ---------- Normalización: el formato que usa toda nuestra app ----------
export function normalizeDetails(data) {
  const platforms = Object.entries(data.platforms ?? {})
    .filter(([, available]) => available)
    .map(([name]) => ({ windows: 'Windows', mac: 'Mac', linux: 'Linux' })[name] ?? name);

  return {
    id: data.steam_appid,
    slug: String(data.steam_appid),
    name: data.name,
    cover_url: data.header_image ?? null,
    released: parseSteamDate(data.release_date?.date),
    genres: (data.genres ?? []).map((genre) => genre.description),
    platforms,
    metacritic: data.metacritic?.score ?? null,
    // Datos extra solo para la vista de detalle
    description: data.short_description ?? '',
    about: data.about_the_game ?? '',
    developers: data.developers ?? [],
    publishers: data.publishers ?? [],
    price: data.is_free ? 'Gratis' : data.price_overview?.final_formatted ?? null,
    coming_soon: Boolean(data.release_date?.coming_soon),
    screenshots: (data.screenshots ?? []).slice(0, 6).map((shot) => ({ id: shot.id, image: shot.path_full, thumb: shot.path_thumbnail })),
  };
}

// Detalle de un juego por su id de Steam (appid). Devuelve null si no existe o no es un juego.
export function getGameDetails(appId) {
  return cached(`details:${appId}`, DETAILS_TTL, async () => {
    const json = await steamJson(`/appdetails?appids=${appId}&${LANG}`);
    const entry = json?.[appId];
    if (!entry?.success || entry.data?.type !== 'game') return null;
    return normalizeDetails(entry.data);
  });
}

// Datos básicos a partir de lo que ya trae una lista de Steam (sin pedir el detalle)
function basicFromListItem(item) {
  const platforms = item.platforms
    ? Object.entries(item.platforms).filter(([, ok]) => ok).map(([name]) => ({ windows: 'Windows', mac: 'Mac', linux: 'Linux' })[name] ?? name)
    : [item.windows_available && 'Windows', item.mac_available && 'Mac', item.linux_available && 'Linux'].filter(Boolean);
  return {
    id: item.id,
    slug: String(item.id),
    name: item.name,
    cover_url: item.header_image ?? item.large_capsule_image ?? item.tiny_image ?? null,
    released: null,
    genres: [],
    platforms,
    metacritic: item.metascore ? Number(item.metascore) || null : null,
  };
}

// Pide los detalles en paralelo. Si alguno falla o tarda, usamos los datos básicos de la lista
// en vez de perder el resultado. Los que no son juegos (DLC, música...) se descartan.
async function enrich(items, limit) {
  const chosen = items.slice(0, limit);
  const results = await Promise.allSettled(chosen.map((item) => getGameDetails(item.id)));
  return results
    .map((result, i) => {
      if (result.status === 'fulfilled') return result.value; // null = no es un juego
      return basicFromListItem(chosen[i]);
    })
    .filter(Boolean);
}

// Búsqueda por texto
export function searchGames(term, limit = 10) {
  return cached(`search:${term.toLowerCase()}`, LIST_TTL, async () => {
    const json = await steamJson(`/storesearch/?term=${encodeURIComponent(term)}&${LANG}`);
    const items = (json.items ?? []).filter((item) => item.type === 'app');
    return enrich(items, limit);
  });
}

// Destacados: más vendidos + novedades de la tienda.
// Usamos directo los datos de la lista (un solo pedido a Steam), así carga rápido.
export function getFeaturedGames(limit = 12) {
  return cached('featured', LIST_TTL, async () => {
    const json = await steamJson(`/featuredcategories?${LANG}`);
    const items = [...(json.top_sellers?.items ?? []), ...(json.new_releases?.items ?? [])];
    const seen = new Set();
    return items
      .filter((item) => (item.type ?? 0) === 0 && item.id && item.name && !seen.has(item.id) && seen.add(item.id))
      .slice(0, limit)
      .map(basicFromListItem);
  });
}
