import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler, conflict, notFound } from '../utils/httpError.js';
import { assertValid, parseId } from '../utils/validate.js';
import { enrichGame, parseGamePayload, upsertGame } from '../utils/games.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

function parseCollectionBody(body, { partial = false } = {}) {
  const errors = {};
  const data = {};
  if (!partial || 'name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 80) errors.name = 'El nombre debe tener entre 1 y 80 caracteres';
    else data.name = name;
  }
  if ('description' in body) {
    if (typeof body.description !== 'string' || body.description.length > 300) {
      errors.description = 'La descripción puede tener hasta 300 caracteres';
    } else data.description = body.description.trim();
  }
  assertValid(errors);
  return data;
}

// Busca la colección SOLO entre las del usuario: si es de otro, responde 404 igual que si no existiera.
async function getOwnCollection(db, userId, collectionId) {
  const { rows } = await db.query(
    'SELECT id, name, description, created_at, updated_at FROM collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!rows[0]) throw notFound('Colección no encontrada');
  return rows[0];
}

// GET /api/collections -> mis colecciones con cantidad de juegos y hasta 4 portadas
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
              COUNT(ci.game_id) AS game_count,
              COALESCE(
                (ARRAY_AGG(g.cover_url ORDER BY ci.added_at DESC) FILTER (WHERE g.cover_url IS NOT NULL))[1:4],
                '{}'
              ) AS covers
       FROM collections c
       LEFT JOIN collection_items ci ON ci.collection_id = c.id
       LEFT JOIN games g ON g.id = ci.game_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [req.user.id]
    );
    res.json({ collections: rows });
  })
);

// POST /api/collections  body: { name, description? }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseCollectionBody(req.body ?? {});
    const collection = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO collections (user_id, name, description) VALUES ($1, $2, $3)
         RETURNING id, name, description, created_at, updated_at`,
        [req.user.id, data.name, data.description ?? '']
      ).catch((error) => {
        if (error.code === '23505') throw conflict('Ya tenés una colección con ese nombre');
        throw error;
      });
      await logActivity(client, req.user.id, 'collection_create', {
        collectionId: rows[0].id, details: { name: data.name },
      });
      return rows[0];
    });
    res.status(201).json({ collection: { ...collection, game_count: 0, covers: [] } });
  })
);

// GET /api/collections/:id -> detalle con sus juegos (y su estado en mi biblioteca, si está)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'id de la colección');
    const collection = await getOwnCollection({ query }, req.user.id, id);
    const { rows: games } = await query(
      `SELECT g.id, g.slug, g.name, g.cover_url, g.released, g.genres, g.platforms, g.metacritic,
              ci.added_at, li.status, li.rating, li.is_favorite
       FROM collection_items ci
       JOIN games g ON g.id = ci.game_id
       LEFT JOIN library_items li ON li.game_id = g.id AND li.user_id = $2
       WHERE ci.collection_id = $1
       ORDER BY ci.added_at DESC`,
      [id, req.user.id]
    );
    res.json({ collection: { ...collection, games } });
  })
);

// PATCH /api/collections/:id  body: { name?, description? }
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'id de la colección');
    const data = parseCollectionBody(req.body ?? {}, { partial: true });
    if (Object.keys(data).length === 0) assertValid({ _: 'No hay datos para actualizar' });

    const collection = await withTransaction(async (client) => {
      const current = await getOwnCollection(client, req.user.id, id);
      const { rows } = await client.query(
        `UPDATE collections SET name = $3, description = $4, updated_at = now()
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, description, created_at, updated_at`,
        [id, req.user.id, data.name ?? current.name, data.description ?? current.description]
      ).catch((error) => {
        if (error.code === '23505') throw conflict('Ya tenés una colección con ese nombre');
        throw error;
      });
      await logActivity(client, req.user.id, 'collection_update', {
        collectionId: id, details: { name: rows[0].name, previous_name: current.name },
      });
      return rows[0];
    });
    res.json({ collection });
  })
);

// DELETE /api/collections/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'id de la colección');
    await withTransaction(async (client) => {
      const current = await getOwnCollection(client, req.user.id, id);
      await client.query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      await logActivity(client, req.user.id, 'collection_delete', {
        collectionId: id, details: { name: current.name },
      });
    });
    res.status(204).end();
  })
);

// POST /api/collections/:id/games  body: { game: {...datos de Steam} }
router.post(
  '/:id/games',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'id de la colección');
    const game = await enrichGame(parseGamePayload(req.body?.game));

    await withTransaction(async (client) => {
      const collection = await getOwnCollection(client, req.user.id, id);
      await upsertGame(client, game);
      const inserted = await client.query(
        `INSERT INTO collection_items (collection_id, game_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, game.id]
      );
      if (inserted.rowCount === 0) throw conflict('El juego ya está en esta colección');
      await client.query('UPDATE collections SET updated_at = now() WHERE id = $1', [id]);
      await logActivity(client, req.user.id, 'collection_add_game', {
        gameId: game.id, collectionId: id, details: { name: game.name, collection: collection.name },
      });
    });
    res.status(201).json({ ok: true });
  })
);

// DELETE /api/collections/:id/games/:gameId
router.delete(
  '/:id/games/:gameId',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'id de la colección');
    const gameId = parseId(req.params.gameId, 'id del juego');

    await withTransaction(async (client) => {
      const collection = await getOwnCollection(client, req.user.id, id);
      const { rows } = await client.query(
        `DELETE FROM collection_items ci USING games g
         WHERE ci.collection_id = $1 AND ci.game_id = $2 AND g.id = ci.game_id
         RETURNING g.name`,
        [id, gameId]
      );
      if (!rows[0]) throw notFound('El juego no está en esta colección');
      await client.query('UPDATE collections SET updated_at = now() WHERE id = $1', [id]);
      await logActivity(client, req.user.id, 'collection_remove_game', {
        gameId, collectionId: id, details: { name: rows[0].name, collection: collection.name },
      });
    });
    res.status(204).end();
  })
);

export default router;
