import { assertValid, isNonEmptyString } from './validate.js';
import { getGameDetails } from '../services/steam.js';

// Valida los datos del juego que manda el frontend (sacados de Steam)
// y devuelve un objeto limpio.
export function parseGamePayload(game) {
  const errors = {};
  if (!game || typeof game !== 'object') {
    assertValid({ game: 'Faltan los datos del juego' });
  }
  const id = Number(game.id);
  if (!Number.isInteger(id) || id <= 0) errors['game.id'] = 'Id de juego inválido';
  if (!isNonEmptyString(game.name)) errors['game.name'] = 'Falta el nombre del juego';
  if (!isNonEmptyString(game.slug)) errors['game.slug'] = 'Falta el slug del juego';
  if (game.released && !/^\d{4}-\d{2}-\d{2}$/.test(game.released)) {
    errors['game.released'] = 'Fecha inválida (YYYY-MM-DD)';
  }
  assertValid(errors);

  const toNames = (list) =>
    Array.isArray(list)
      ? list.filter((item) => typeof item === 'string' && item.trim()).slice(0, 20)
      : [];

  return {
    id,
    slug: game.slug.trim().slice(0, 255),
    name: game.name.trim().slice(0, 255),
    cover_url: typeof game.cover_url === 'string' ? game.cover_url : null,
    released: game.released || null,
    genres: toNames(game.genres),
    platforms: toNames(game.platforms),
    metacritic: Number.isInteger(game.metacritic) ? game.metacritic : null,
  };
}

// Inserta el juego en la tabla games o actualiza sus datos si ya existía.
export async function upsertGame(db, game) {
  await db.query(
    `INSERT INTO games (id, slug, name, cover_url, released, genres, platforms, metacritic)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       slug = EXCLUDED.slug,
       name = EXCLUDED.name,
       cover_url = COALESCE(EXCLUDED.cover_url, games.cover_url),
       released = COALESCE(EXCLUDED.released, games.released),
       genres = CASE WHEN cardinality(EXCLUDED.genres) > 0 THEN EXCLUDED.genres ELSE games.genres END,
       platforms = CASE WHEN cardinality(EXCLUDED.platforms) > 0 THEN EXCLUDED.platforms ELSE games.platforms END,
       metacritic = COALESCE(EXCLUDED.metacritic, games.metacritic),
       updated_at = now()`,
    [game.id, game.slug, game.name, game.cover_url, game.released, game.genres, game.platforms, game.metacritic]
  );
}

// Si al juego le faltan datos (por ejemplo, vino de la lista de destacados, que no trae
// géneros ni fecha), los completamos con el detalle de Steam antes de guardarlo.
// Si Steam no responde, se guarda igual con lo que hay.
export async function enrichGame(game) {
  if (game.genres.length > 0 && game.released) return game;
  try {
    const details = await getGameDetails(game.id);
    if (!details) return game;
    return {
      ...game,
      cover_url: game.cover_url ?? details.cover_url,
      released: game.released ?? details.released,
      genres: game.genres.length ? game.genres : details.genres,
      platforms: game.platforms.length ? game.platforms : details.platforms,
      metacritic: game.metacritic ?? details.metacritic,
    };
  } catch {
    return game;
  }
}
