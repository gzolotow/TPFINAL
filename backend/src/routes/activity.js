import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();

// GET /api/activity?limit=20 -> mi actividad más reciente (con portada del juego si hay)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { rows } = await query(
      `SELECT a.id, a.type, a.game_id, a.collection_id, a.details, a.created_at,
              g.slug AS game_slug, g.cover_url AS game_cover
       FROM activity a
       LEFT JOIN games g ON g.id = a.game_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json({ activity: rows });
  })
);

export default router;
