import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, badRequest } from '../utils/httpError.js';

const router = Router();

// GET /api/stats?year=2026
// Todas las estadísticas se calculan en el momento con consultas SQL sobre los
// datos reales del usuario. No hay ningún valor fijo: si cambia la biblioteca,
// cambian los números.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1970 || year > 2100) throw badRequest('Año inválido');

    const [
      summary,
      ratingDistribution,
      genres,
      platforms,
      completedByMonth,
      topRated,
      mostPlayed,
      decades,
      goal,
    ] = await Promise.all([
      // 1. Resumen general
      query(
        `SELECT
           COUNT(*)                                              AS total_games,
           COUNT(*) FILTER (WHERE status = 'want_to_play')       AS want_to_play,
           COUNT(*) FILTER (WHERE status = 'playing')            AS playing,
           COUNT(*) FILTER (WHERE status = 'completed')          AS completed,
           COUNT(*) FILTER (WHERE status = 'abandoned')          AS abandoned,
           COUNT(*) FILTER (WHERE is_favorite)                   AS favorites,
           COUNT(rating)                                         AS rated,
           ROUND(AVG(rating)::numeric, 2)                        AS average_rating,
           COALESCE(SUM(hours_played), 0)                        AS total_hours,
           ROUND(AVG(hours_played) FILTER (WHERE status = 'completed')::numeric, 1) AS avg_hours_per_completed,
           (SELECT COUNT(*) FROM reviews WHERE user_id = $1)     AS reviews,
           (SELECT COUNT(*) FROM collections WHERE user_id = $1) AS collections
         FROM library_items WHERE user_id = $1`,
        [userId]
      ),
      // 2. Distribución de puntuaciones (1 a 5 estrellas, incluso las que tienen 0)
      query(
        `SELECT s.stars, COUNT(li.id) AS count
         FROM generate_series(1, 5) AS s(stars)
         LEFT JOIN library_items li ON li.rating = s.stars AND li.user_id = $1
         GROUP BY s.stars ORDER BY s.stars`,
        [userId]
      ),
      // 3. Géneros favoritos: cuántos juegos de cada género y su puntuación promedio
      query(
        `SELECT genre, COUNT(*) AS count, ROUND(AVG(li.rating)::numeric, 2) AS average_rating
         FROM library_items li
         JOIN games g ON g.id = li.game_id
         CROSS JOIN LATERAL unnest(g.genres) AS genre
         WHERE li.user_id = $1
         GROUP BY genre ORDER BY count DESC, genre LIMIT 8`,
        [userId]
      ),
      // 4. Plataformas más usadas (la que eligió el usuario para cada juego) y horas en cada una
      query(
        `SELECT platform, COUNT(*) AS count, COALESCE(SUM(hours_played), 0) AS hours
         FROM library_items
         WHERE user_id = $1 AND platform IS NOT NULL
         GROUP BY platform ORDER BY count DESC, hours DESC LIMIT 6`,
        [userId]
      ),
      // 5. Juegos terminados por mes del año pedido
      query(
        `SELECT m.month, COUNT(li.id) AS count
         FROM generate_series(1, 12) AS m(month)
         LEFT JOIN library_items li
           ON li.user_id = $1 AND li.status = 'completed'
          AND EXTRACT(YEAR FROM li.completed_at) = $2
          AND EXTRACT(MONTH FROM li.completed_at) = m.month
         GROUP BY m.month ORDER BY m.month`,
        [userId, year]
      ),
      // 6. Mejor puntuados
      query(
        `SELECT g.id, g.slug, g.name, g.cover_url, li.rating, li.hours_played
         FROM library_items li JOIN games g ON g.id = li.game_id
         WHERE li.user_id = $1 AND li.rating IS NOT NULL
         ORDER BY li.rating DESC, li.hours_played DESC, g.name LIMIT 5`,
        [userId]
      ),
      // 7. Más horas jugadas
      query(
        `SELECT g.id, g.slug, g.name, g.cover_url, li.hours_played, li.status
         FROM library_items li JOIN games g ON g.id = li.game_id
         WHERE li.user_id = $1 AND li.hours_played > 0
         ORDER BY li.hours_played DESC LIMIT 5`,
        [userId]
      ),
      // 8. Décadas de lanzamiento de los juegos de la biblioteca
      query(
        `SELECT (EXTRACT(YEAR FROM g.released)::int / 10) * 10 AS decade, COUNT(*) AS count
         FROM library_items li JOIN games g ON g.id = li.game_id
         WHERE li.user_id = $1 AND g.released IS NOT NULL
         GROUP BY decade ORDER BY decade`,
        [userId]
      ),
      // 9. Desafío anual: objetivo del perfil vs. terminados en el año
      query(
        `SELECT u.yearly_goal AS goal,
                (SELECT COUNT(*) FROM library_items
                  WHERE user_id = $1 AND status = 'completed'
                    AND EXTRACT(YEAR FROM completed_at) = $2) AS completed
         FROM users u WHERE u.id = $1`,
        [userId, year]
      ),
    ]);

    const s = summary.rows[0];
    const challenge = goal.rows[0];

    // Porcentajes calculados a partir de los conteos reales
    const startedOrDone = s.total_games - s.want_to_play;
    const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

    res.json({
      year,
      summary: {
        ...s,
        completion_rate: percent(s.completed, s.total_games),       // % de la biblioteca terminado
        finish_rate: percent(s.completed, startedOrDone),            // de lo que empecé, cuánto terminé
        abandon_rate: percent(s.abandoned, startedOrDone),
      },
      challenge: {
        year,
        goal: challenge.goal,
        completed: challenge.completed,
        percent: Math.min(percent(challenge.completed, challenge.goal), 100),
      },
      rating_distribution: ratingDistribution.rows,
      top_genres: genres.rows,
      top_platforms: platforms.rows,
      completed_by_month: completedByMonth.rows,
      top_rated: topRated.rows,
      most_played: mostPlayed.rows,
      decades: decades.rows,
    });
  })
);

export default router;
