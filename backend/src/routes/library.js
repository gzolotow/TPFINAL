import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler, conflict, notFound } from '../utils/httpError.js';
import { assertValid, parseId, STATUSES } from '../utils/validate.js';
import { parseGamePayload, upsertGame } from '../utils/games.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

// SELECT común: el item de la biblioteca con los datos del juego anidados
export const LIBRARY_SELECT = `
  SELECT li.id, li.game_id, li.status, li.is_favorite, li.rating, li.hours_played, li.platform,
         li.started_at, li.completed_at, li.added_at, li.updated_at,
         json_build_object(
           'id', g.id, 'slug', g.slug, 'name', g.name, 'cover_url', g.cover_url,
           'released', g.released, 'genres', g.genres, 'platforms', g.platforms,
           'metacritic', g.metacritic
         ) AS game,
         (r.id IS NOT NULL) AS has_review
  FROM library_items li
  JOIN games g ON g.id = li.game_id
  LEFT JOIN reviews r ON r.user_id = li.user_id AND r.game_id = li.game_id`;

// Orden permitido -> SQL. Usamos un mapa fijo para no meter texto del usuario en la consulta.
const SORTS = {
  recent: 'li.updated_at DESC',
  added: 'li.added_at DESC',
  name: 'g.name ASC',
  rating: 'li.rating DESC NULLS LAST, g.name ASC',
  hours: 'li.hours_played DESC, g.name ASC',
  released: 'g.released DESC NULLS LAST',
};

async function getItem(db, userId, gameId) {
  const { rows } = await db.query(`${LIBRARY_SELECT} WHERE li.user_id = $1 AND li.game_id = $2`, [userId, gameId]);
  return rows[0] ?? null;
}

// GET /api/library?status=playing&favorite=true&q=zelda&sort=rating
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, favorite, q, sort = 'recent' } = req.query;
    const errors = {};
    if (status && !STATUSES.includes(status)) errors.status = `Estado inválido. Opciones: ${STATUSES.join(', ')}`;
    if (!SORTS[sort]) errors.sort = `Orden inválido. Opciones: ${Object.keys(SORTS).join(', ')}`;
    assertValid(errors);

    const conditions = ['li.user_id = $1'];
    const params = [req.user.id];
    if (status) {
      params.push(status);
      conditions.push(`li.status = $${params.length}`);
    }
    if (favorite === 'true') conditions.push('li.is_favorite');
    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`g.name ILIKE $${params.length}`);
    }

    const { rows } = await query(
      `${LIBRARY_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY ${SORTS[sort]}`,
      params
    );
    res.json({ items: rows });
  })
);

// GET /api/library/:gameId -> estado de un juego en mi biblioteca (404 si no está)
router.get(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const gameId = parseId(req.params.gameId, 'id del juego');
    const item = await getItem({ query }, req.user.id, gameId);
    if (!item) throw notFound('El juego no está en tu biblioteca');
    res.json({ item });
  })
);

// POST /api/library  body: { game: {...datos de Steam}, status?, is_favorite? }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const game = parseGamePayload(req.body?.game);
    const status = req.body?.status ?? 'want_to_play';
    const isFavorite = req.body?.is_favorite === true;
    if (!STATUSES.includes(status)) assertValid({ status: 'Estado inválido' });

    const item = await withTransaction(async (client) => {
      await upsertGame(client, game);
      const inserted = await client.query(
        `INSERT INTO library_items (user_id, game_id, status, is_favorite, started_at, completed_at)
         VALUES ($1, $2, $3::varchar, $4,
                 CASE WHEN $3::varchar IN ('playing', 'completed', 'abandoned') THEN now() END,
                 CASE WHEN $3::varchar = 'completed' THEN now() END)
         ON CONFLICT (user_id, game_id) DO NOTHING
         RETURNING id`,
        [req.user.id, game.id, status, isFavorite]
      );
      if (inserted.rowCount === 0) throw conflict('El juego ya está en tu biblioteca');

      await logActivity(client, req.user.id, 'library_add', {
        gameId: game.id,
        details: { name: game.name, status },
      });
      return getItem(client, req.user.id, game.id);
    });

    res.status(201).json({ item });
  })
);

// PATCH /api/library/:gameId  body: { status?, is_favorite?, rating? (1-5 o null), hours_played?, platform? }
router.patch(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const gameId = parseId(req.params.gameId, 'id del juego');
    const body = req.body ?? {};
    const errors = {};

    if ('status' in body && !STATUSES.includes(body.status)) errors.status = 'Estado inválido';
    if ('is_favorite' in body && typeof body.is_favorite !== 'boolean') errors.is_favorite = 'Debe ser true o false';
    if ('rating' in body && body.rating !== null && !(Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5)) {
      errors.rating = 'La puntuación debe ser un entero de 1 a 5 (o null para quitarla)';
    }
    if ('hours_played' in body) {
      const hours = Number(body.hours_played);
      if (!Number.isFinite(hours) || hours < 0 || hours > 99999) errors.hours_played = 'Horas inválidas';
    }
    if ('platform' in body && body.platform !== null && (typeof body.platform !== 'string' || body.platform.length > 60)) {
      errors.platform = 'Plataforma inválida';
    }
    assertValid(errors);
    if (!['status', 'is_favorite', 'rating', 'hours_played', 'platform'].some((key) => key in body)) {
      assertValid({ _: 'No hay datos para actualizar' });
    }

    const item = await withTransaction(async (client) => {
      const current = await getItem(client, req.user.id, gameId);
      if (!current) throw notFound('El juego no está en tu biblioteca');

      const next = {
        status: body.status ?? current.status,
        is_favorite: 'is_favorite' in body ? body.is_favorite : current.is_favorite,
        rating: 'rating' in body ? body.rating : current.rating,
        hours_played: 'hours_played' in body ? Math.round(Number(body.hours_played) * 10) / 10 : current.hours_played,
        platform: 'platform' in body ? body.platform?.trim() || null : current.platform,
      };

      await client.query(
        `UPDATE library_items SET
           status = $3::varchar,
           is_favorite = $4,
           rating = $5,
           hours_played = $6,
           platform = $7,
           -- Fecha en que se empezó: la primera vez que deja de estar en "quiero jugar"
           started_at = CASE WHEN started_at IS NULL AND $3::varchar <> 'want_to_play' THEN now() ELSE started_at END,
           -- Fecha de terminado: se pone al pasar a "completed" y se borra si sale de ese estado
           completed_at = CASE
             WHEN $3::varchar = 'completed' AND status <> 'completed' THEN now()
             WHEN $3::varchar <> 'completed' THEN NULL
             ELSE completed_at END,
           updated_at = now()
         WHERE user_id = $1 AND game_id = $2`,
        [req.user.id, gameId, next.status, next.is_favorite, next.rating, next.hours_played, next.platform]
      );

      // Una actividad por cada cosa que cambió
      const name = current.game.name;
      if (next.status !== current.status) {
        await logActivity(client, req.user.id, 'status_change', {
          gameId, details: { name, from: current.status, to: next.status },
        });
      }
      if (next.is_favorite !== current.is_favorite) {
        await logActivity(client, req.user.id, next.is_favorite ? 'favorite_add' : 'favorite_remove', {
          gameId, details: { name },
        });
      }
      if (next.rating !== current.rating) {
        await logActivity(client, req.user.id, next.rating ? 'rating_set' : 'rating_remove', {
          gameId, details: { name, rating: next.rating },
        });
      }
      if (next.platform !== current.platform && next.platform) {
        await logActivity(client, req.user.id, 'platform_set', {
          gameId, details: { name, platform: next.platform },
        });
      }
      if (next.hours_played !== current.hours_played) {
        await logActivity(client, req.user.id, 'hours_update', {
          gameId, details: { name, hours: next.hours_played },
        });
      }

      return getItem(client, req.user.id, gameId);
    });

    res.json({ item });
  })
);

// DELETE /api/library/:gameId  (también borra su reseña por la FK en cascada)
router.delete(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const gameId = parseId(req.params.gameId, 'id del juego');

    await withTransaction(async (client) => {
      const current = await getItem(client, req.user.id, gameId);
      if (!current) throw notFound('El juego no está en tu biblioteca');
      await client.query('DELETE FROM library_items WHERE user_id = $1 AND game_id = $2', [req.user.id, gameId]);
      await logActivity(client, req.user.id, 'library_remove', { gameId, details: { name: current.game.name } });
    });

    res.status(204).end();
  })
);

export default router;
        