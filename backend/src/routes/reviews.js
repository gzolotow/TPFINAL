import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler, notFound } from '../utils/httpError.js';
import { assertValid, parseId } from '../utils/validate.js';
import { logActivity } from '../utils/activity.js';

const router = Router();

const REVIEW_SELECT = `
  SELECT r.id, r.game_id, r.body, r.created_at, r.updated_at, li.rating,
         json_build_object('id', g.id, 'slug', g.slug, 'name', g.name, 'cover_url', g.cover_url) AS game
  FROM reviews r
  JOIN library_items li ON li.user_id = r.user_id AND li.game_id = r.game_id
  JOIN games g ON g.id = r.game_id`;

// GET /api/reviews -> todas mis reseñas, la más reciente primero
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${REVIEW_SELECT} WHERE r.user_id = $1 ORDER BY r.updated_at DESC`, [req.user.id]);
    res.json({ reviews: rows });
  })
);

// GET /api/reviews/:gameId -> mi reseña de un juego (404 si no tengo)
router.get(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const gameId = parseId(req.params.gameId, 'id del juego');
    const { rows } = await query(`${REVIEW_SELECT} WHERE r.user_id = $1 AND r.game_id = $2`, [req.user.id, gameId]);
    if (!rows[0]) throw notFound('Todavía no reseñaste este juego');
    res.json({ review: rows[0] });
  })
);

// PUT /api/reviews/:gameId  body: { body }  -> crea o edita la reseña
// El juego tiene que estar en la biblioteca.
router.put(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const gameId = parseId(req.params.gameId, 'id del juego');
    const text = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (text.length < 10 || text.length > 3000) {
      assertValid({ body: 'La reseña debe tener entre 10 y 3000 caracteres' });
    }

    const { review, created } = await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT g.name FROM library_items li JOIN games g ON g.id = li.game_id
         WHERE li.user_id = $1 AND li.game_id = $2`,
        [req.user.id, gameId]
      );
      if (!owned.rows[0]) throw notFound('Agregá el juego a tu biblioteca antes de reseñarlo');

      // xmax = 0 indica que la fila se insertó (no se actualizó)
      const upsert = await client.query(
        `INSERT INTO reviews (user_id, game_id, body) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, game_id) DO UPDATE SET body = EXCLUDED.body, updated_at = now()
         RETURNING (xmax = 0) AS created`,
        [req.user.id, gameId, text]
      );
      const wasCreated = upsert.rows[0].created;

      await logActivity(client, req.user.id, wasCreated ? 'review_create' : 'review_update', {
        gameId, details: { name: owned.rows[0].name },
      });

      const { rows } = await client.query(`${REVIEW_SELECT} WHERE r.user_id = $1 AND r.game_id = $2`, [req.user.id, gameId]);
      return { review: rows[0], created: wasCreated };
    });

    res.status(created ? 201 : 200).json({ review });
  })
);

// DELETE /api/reviews/:gameId
router.delete(
  '/:gameId',
  asyncHandler(async (req, res) => {
    const gameId = parseId(req.params.gameId, 'id del juego');
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `DELETE FROM reviews r USING games g
         WHERE r.user_id = $1 AND r.game_id = $2 AND g.id = r.game_id
         RETURNING g.name`,
        [req.user.id, gameId]
      );
      if (!rows[0]) throw notFound('No tenés reseña de este juego');
      await logActivity(client, req.user.id, 'review_delete', { gameId, details: { name: rows[0].name } });
    });
    res.status(204).end();
  })
);

export default router;
