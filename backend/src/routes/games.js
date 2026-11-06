import { Router } from 'express';
import { asyncHandler, notFound } from '../utils/httpError.js';
import { assertValid, parseId } from '../utils/validate.js';
import { getFeaturedGames, getGameDetails, searchGames } from '../services/steam.js';

const router = Router();

const PLATFORMS = ['Windows', 'Mac', 'Linux'];
// Ordenamientos permitidos (se aplican sobre los resultados de Steam)
const SORTS = {
  relevance: null,
  name: (a, b) => a.name.localeCompare(b.name),
  metacritic: (a, b) => (b.metacritic ?? -1) - (a.metacritic ?? -1),
  newest: (a, b) => (b.released ?? '').localeCompare(a.released ?? ''),
  oldest: (a, b) => (a.released ?? '9999').localeCompare(b.released ?? '9999'),
};

// Saca los campos que solo usa el detalle, para que las listas pesen menos
const toListItem = ({ about, screenshots, developers, publishers, ...game }) => game;

// GET /api/games/featured -> destacados de la tienda
router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const games = await getFeaturedGames();
    res.json({ games: games.map(toListItem) });
  })
);

// GET /api/games/search?q=hollow&platform=Linux&genre=Indie&sort=metacritic
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q = '', platform = '', genre = '', sort = 'relevance' } = req.query;
    const errors = {};
    if (q.trim().length < 2) errors.q = 'Escribí al menos 2 letras para buscar';
    if (platform && !PLATFORMS.includes(platform)) errors.platform = `Plataforma inválida. Opciones: ${PLATFORMS.join(', ')}`;
    if (!(sort in SORTS)) errors.sort = `Orden inválido. Opciones: ${Object.keys(SORTS).join(', ')}`;
    assertValid(errors);

    let games = await searchGames(q.trim());
    if (platform) games = games.filter((game) => game.platforms.includes(platform));
    if (genre) games = games.filter((game) => game.genres.includes(genre));
    if (SORTS[sort]) games = [...games].sort(SORTS[sort]);

    res.json({ games: games.map(toListItem) });
  })
);

// GET /api/games/:id -> detalle completo de un juego de Steam
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, 'id del juego');
    const game = await getGameDetails(id);
    if (!game) throw notFound('No encontramos ese juego en Steam');
    res.json({ game });
  })
);

export default router;
