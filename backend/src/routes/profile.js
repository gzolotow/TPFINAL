import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { asyncHandler } from '../utils/httpError.js';
import { assertValid, isStringArray, isValidUrl } from '../utils/validate.js';
import { logActivity } from '../utils/activity.js';
import { PUBLIC_USER_COLUMNS } from './auth.js';

const router = Router();

// GET /api/profile -> datos del usuario + contadores rápidos
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const [userResult, countsResult] = await Promise.all([
      query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`, [userId]),
      query(
        `SELECT
           (SELECT COUNT(*) FROM library_items WHERE user_id = $1)                         AS library,
           (SELECT COUNT(*) FROM library_items WHERE user_id = $1 AND is_favorite)         AS favorites,
           (SELECT COUNT(*) FROM library_items WHERE user_id = $1 AND status = 'completed') AS completed,
           (SELECT COUNT(*) FROM reviews WHERE user_id = $1)                               AS reviews,
           (SELECT COUNT(*) FROM collections WHERE user_id = $1)                           AS collections`,
        [userId]
      ),
    ]);
    res.json({ user: userResult.rows[0], counts: countsResult.rows[0] });
  })
);

// PATCH /api/profile -> edita los datos personales (solo los campos enviados)
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const errors = {};
    const updates = {};

    if ('display_name' in body) {
      if (typeof body.display_name !== 'string' || body.display_name.trim().length < 1 || body.display_name.length > 60) {
        errors.display_name = 'El nombre debe tener entre 1 y 60 caracteres';
      } else updates.display_name = body.display_name.trim();
    }
    if ('bio' in body) {
      if (typeof body.bio !== 'string' || body.bio.length > 500) errors.bio = 'La bio puede tener hasta 500 caracteres';
      else updates.bio = body.bio.trim();
    }
    if ('avatar_url' in body) {
      if (body.avatar_url === null || body.avatar_url === '') updates.avatar_url = null;
      else if (typeof body.avatar_url !== 'string' || !isValidUrl(body.avatar_url)) errors.avatar_url = 'Ingresá una URL válida (http o https)';
      else updates.avatar_url = body.avatar_url.trim();
    }
    if ('favorite_genres' in body) {
      if (!isStringArray(body.favorite_genres, 10)) errors.favorite_genres = 'Hasta 10 géneros';
      else updates.favorite_genres = body.favorite_genres;
    }
    if ('favorite_platforms' in body) {
      if (!isStringArray(body.favorite_platforms, 10)) errors.favorite_platforms = 'Hasta 10 plataformas';
      else updates.favorite_platforms = body.favorite_platforms;
    }
    if ('yearly_goal' in body) {
      const goal = Number(body.yearly_goal);
      if (!Number.isInteger(goal) || goal < 1 || goal > 365) errors.yearly_goal = 'El objetivo anual debe ser entre 1 y 365';
      else updates.yearly_goal = goal;
    }
    assertValid(errors);

    const fields = Object.keys(updates);
    if (fields.length === 0) assertValid({ _: 'No hay datos para actualizar' });

    // Armamos "campo = $n" solo con columnas validadas arriba (nunca con texto del usuario)
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const user = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE users SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING ${PUBLIC_USER_COLUMNS}`,
        [req.user.id, ...fields.map((field) => updates[field])]
      );
      await logActivity(client, req.user.id, 'profile_update', { details: { fields } });
      return rows[0];
    });

    res.json({ user });
  })
);

export default router;
