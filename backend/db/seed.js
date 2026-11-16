// Carga la cuenta de demostración con historia: biblioteca, favoritos, puntuaciones,
// reseñas, colecciones y actividad con fechas pasadas.
//
// Uso: npm run seed
// Necesita en el .env: DATABASE_URL, DEMO_EMAIL y DEMO_PASSWORD.
// Trae de la API de Steam los datos reales de cada juego (portada, géneros, fecha...).
// Si Steam no responde, usa datos de respaldo sin portada (sirve para probar sin internet).
//
// Es reproducible: si el usuario demo ya existe, lo borra (con todo lo suyo) y lo vuelve a crear.

import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../src/db.js';
import { getGameDetails } from '../src/services/steam.js';

const { DEMO_EMAIL, DEMO_PASSWORD } = process.env;
const DEMO_USERNAME = 'demo_gamer';

if (!DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error('Definí DEMO_EMAIL y DEMO_PASSWORD en el .env antes de correr el seed');
  process.exit(1);
}

// Juegos de la cuenta demo.
// id: el appid de Steam. fallback: datos mínimos por si Steam no responde.
// mine: lo que el usuario demo hizo con cada juego.
const SEED_GAMES = [
  {
    key: 'the-witcher-3-wild-hunt',
    id: 292030,
    fallback: { name: 'The Witcher 3: Wild Hunt', released: '2015-05-18', genres: ['Acción', 'Rol'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: true, rating: 5, hours: 120, platform: 'PC', added: '2025-12-20', completed: '2026-02-14' },
    review: 'La mejor historia que jugué. Las misiones secundarias tienen más desarrollo que muchos juegos enteros y Geralt es un personaje enorme. Imprescindible con las dos expansiones.',
  },
  {
    key: 'elden-ring',
    id: 1245620,
    fallback: { name: 'ELDEN RING', released: '2022-02-24', genres: ['Acción', 'Rol'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: true, rating: 5, hours: 95, platform: 'PlayStation 5', added: '2026-02-20', completed: '2026-04-20' },
    review: 'Difícil pero justo. Explorar el mundo abierto sin que te lleven de la mano es lo mejor que tiene. Malenia me costó como 40 intentos.',
  },
  {
    key: 'hollow-knight',
    id: 367520,
    fallback: { name: 'Hollow Knight', released: '2017-02-24', genres: ['Acción', 'Aventura', 'Indie'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: true, rating: 5, hours: 42, platform: 'Nintendo Switch', added: '2026-04-25', completed: '2026-06-08' },
    review: 'Un metroidvania perfecto: el mapa, la música y los jefes están a otro nivel. Increíble que lo haya hecho un equipo tan chico.',
  },
  {
    key: 'portal-2',
    id: 620,
    fallback: { name: 'Portal 2', released: '2011-04-18', genres: ['Acción', 'Aventura'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: false, rating: 4, hours: 12, platform: 'PC', added: '2026-01-05', completed: '2026-01-22' },
  },
  {
    key: 'red-dead-redemption-2',
    id: 1174180,
    fallback: { name: 'Red Dead Redemption 2', released: '2019-12-05', genres: ['Acción', 'Aventura'], platforms: ['Windows'] },
    mine: { status: 'playing', fav: true, rating: 5, hours: 60, platform: 'PlayStation 5', added: '2026-08-02' },
  },
  {
    key: 'cyberpunk-2077',
    id: 1091500,
    fallback: { name: 'Cyberpunk 2077', released: '2020-12-09', genres: ['Rol'], platforms: ['Windows'] },
    mine: { status: 'playing', fav: false, rating: 4, hours: 35, platform: 'PC', added: '2026-09-28' },
  },
  {
    key: 'stardew-valley',
    id: 413150,
    fallback: { name: 'Stardew Valley', released: '2016-02-26', genres: ['Indie', 'Rol', 'Simuladores'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: true, rating: 4, hours: 80, platform: 'Nintendo Switch', added: '2026-06-15', completed: '2026-08-30' },
  },
  {
    key: 'god-of-war-2',
    id: 1593500,
    fallback: { name: 'God of War', released: '2022-01-14', genres: ['Acción', 'Aventura'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: false, rating: 4, hours: 30, platform: 'PlayStation 5', added: '2026-09-01', completed: '2026-09-15' },
  },
  {
    key: 'celeste',
    id: 504230,
    fallback: { name: 'Celeste', released: '2018-01-25', genres: ['Acción', 'Aventura', 'Indie'], platforms: ['Windows'] },
    mine: { status: 'abandoned', fav: false, rating: 3, hours: 6, platform: 'Nintendo Switch', added: '2026-03-10' },
    review: 'Muy lindo y la historia toca temas importantes, pero la dificultad del capítulo 7 me superó. Algún día lo retomo con el modo asistido.',
  },
  {
    key: 'grand-theft-auto-v',
    id: 271590,
    fallback: { name: 'Grand Theft Auto V', released: '2015-04-13', genres: ['Acción', 'Aventura'], platforms: ['Windows'] },
    mine: { status: 'abandoned', fav: false, rating: 3, hours: 25, platform: 'PC', added: '2026-01-15' },
  },
  {
    key: 'the-elder-scrolls-v-skyrim',
    id: 489830,
    fallback: { name: 'The Elder Scrolls V: Skyrim Special Edition', released: '2016-10-27', genres: ['Rol'], platforms: ['Windows'] },
    mine: { status: 'completed', fav: false, rating: 4, hours: 200, platform: 'PC', added: '2025-08-01', completed: '2025-11-10' },
  },
  {
    key: 'terraria',
    id: 105600,
    fallback: { name: 'Terraria', released: '2011-05-16', genres: ['Acción', 'Aventura', 'Indie', 'Rol'], platforms: ['Windows'] },
    mine: { status: 'playing', fav: false, rating: null, hours: 150, platform: 'PC', added: '2025-06-01' },
  },
  {
    key: 'bioshock-infinite',
    id: 8870,
    fallback: { name: 'BioShock Infinite', released: '2013-03-25', genres: ['Acción'], platforms: ['Windows'] },
    mine: { status: 'want_to_play', fav: false, rating: null, hours: 0, platform: null, added: '2026-10-05' },
  },
  {
    key: 'half-life-2',
    id: 220,
    fallback: { name: 'Half-Life 2', released: '2004-11-16', genres: ['Acción'], platforms: ['Windows'] },
    mine: { status: 'want_to_play', fav: false, rating: null, hours: 0, platform: null, added: '2026-10-12' },
  },
  {
    key: 'disco-elysium',
    id: 632470,
    fallback: { name: 'Disco Elysium - The Final Cut', released: '2019-10-15', genres: ['Rol', 'Indie'], platforms: ['Windows'] },
    mine: { status: 'want_to_play', fav: false, rating: null, hours: 0, platform: null, added: '2026-10-25' },
  },
];

const SEED_COLLECTIONS = [
  { name: 'Mundos abiertos para perderse', description: 'Los juegos donde más horas dejé explorando.', created: '2026-03-01', games: ['the-witcher-3-wild-hunt', 'elden-ring', 'red-dead-redemption-2', 'the-elder-scrolls-v-skyrim', 'cyberpunk-2077'] },
  { name: 'Joyas indie', description: 'Equipos chicos, juegos gigantes.', created: '2026-06-20', games: ['hollow-knight', 'stardew-valley', 'celeste', 'disco-elysium'] },
  { name: 'Para las vacaciones', description: 'Pendientes para jugar en el verano.', created: '2026-10-26', games: ['bioshock-infinite', 'half-life-2', 'disco-elysium'] },
];

// Trae los datos de cada juego desde Steam; si falla, usa los de respaldo
async function loadGames() {
  const games = {};
  for (const seed of SEED_GAMES) {
    try {
      const game = await getGameDetails(seed.id);
      if (game) {
        games[seed.key] = game;
        console.log(`  Steam ✓ ${game.name}`);
        continue;
      }
    } catch (error) {
      console.warn(`  Steam ✗ ${seed.key}: ${error.message}. Uso datos de respaldo.`);
    }
    games[seed.key] = { ...seed.fallback, id: seed.id, slug: String(seed.id), cover_url: null, metacritic: null };
  }
  return games;
}

const at = (date, hour = 20) => `${date}T${String(hour).padStart(2, '0')}:00:00-03:00`;

async function seed() {
  console.log('Cargando juegos...');
  const games = await loadGames();

  await withTransaction(async (client) => {
    // Reproducible: borramos el demo anterior (ON DELETE CASCADE limpia todo lo suyo)
    await client.query('DELETE FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)', [DEMO_EMAIL, DEMO_USERNAME]);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const { rows } = await client.query(
      `INSERT INTO users (username, email, password_hash, display_name, bio, avatar_url,
                          favorite_genres, favorite_platforms, yearly_goal, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        DEMO_USERNAME,
        DEMO_EMAIL.toLowerCase(),
        passwordHash,
        'Demo Gamer',
        'Juego de todo un poco, pero los RPG de mundo abierto y los metroidvania son mi debilidad. Siempre con 3 juegos empezados a la vez.',
        `https://api.dicebear.com/9.x/pixel-art/svg?seed=${DEMO_USERNAME}`,
        ['Rol', 'Acción', 'Indie'],
        ['PC', 'PlayStation 5', 'Nintendo Switch'],
        12,
        at('2025-06-01', 10),
      ]
    );
    const userId = rows[0].id;

    const log = (type, date, { gameId = null, collectionId = null, details = {} } = {}) =>
      client.query(
        'INSERT INTO activity (user_id, type, game_id, collection_id, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, type, gameId, collectionId, details, date]
      );

    for (const seedGame of SEED_GAMES) {
      const game = games[seedGame.key];
      const mine = seedGame.mine;

      await client.query(
        `INSERT INTO games (id, slug, name, cover_url, released, genres, platforms, metacritic)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name,
           cover_url = EXCLUDED.cover_url, released = EXCLUDED.released, genres = EXCLUDED.genres,
           platforms = EXCLUDED.platforms, metacritic = EXCLUDED.metacritic`,
        [game.id, game.slug, game.name, game.cover_url, game.released, game.genres, game.platforms, game.metacritic]
      );

      const addedAt = at(mine.added, 19);
      const startedAt = mine.status === 'want_to_play' ? null : at(mine.added, 21);
      const completedAt = mine.completed ? at(mine.completed, 23) : null;
      const lastChange = completedAt ?? startedAt ?? addedAt;

      await client.query(
        `INSERT INTO library_items (user_id, game_id, status, is_favorite, rating, hours_played,
                                    platform, started_at, completed_at, added_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [userId, game.id, mine.status, mine.fav, mine.rating, mine.hours, mine.platform, startedAt, completedAt, addedAt, lastChange]
      );

      // Historia de actividad coherente con los datos
      const name = game.name;
      await log('library_add', addedAt, { gameId: game.id, details: { name, status: 'want_to_play' } });
      if (startedAt) {
        await log('status_change', startedAt, { gameId: game.id, details: { name, from: 'want_to_play', to: 'playing' } });
      }
      if (mine.platform) {
        await log('platform_set', startedAt ?? addedAt, { gameId: game.id, details: { name, platform: mine.platform } });
      }
      if (mine.status === 'completed' || mine.status === 'abandoned') {
        await log('status_change', completedAt ?? at(mine.added, 23), {
          gameId: game.id, details: { name, from: 'playing', to: mine.status },
        });
      }
      if (mine.rating) {
        await log('rating_set', completedAt ?? at(mine.added, 23), { gameId: game.id, details: { name, rating: mine.rating } });
      }
      if (mine.fav) {
        await log('favorite_add', completedAt ?? at(mine.added, 23), { gameId: game.id, details: { name } });
      }
      if (seedGame.review) {
        const reviewDate = completedAt ?? at(mine.added, 23);
        await client.query(
          'INSERT INTO reviews (user_id, game_id, body, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)',
          [userId, game.id, seedGame.review, reviewDate]
        );
        await log('review_create', reviewDate, { gameId: game.id, details: { name } });
      }
    }

    for (const seedCollection of SEED_COLLECTIONS) {
      const createdAt = at(seedCollection.created, 18);
      const { rows: created } = await client.query(
        `INSERT INTO collections (user_id, name, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4) RETURNING id`,
        [userId, seedCollection.name, seedCollection.description, createdAt]
      );
      const collectionId = created[0].id;
      await log('collection_create', createdAt, { collectionId, details: { name: seedCollection.name } });

      for (const key of seedCollection.games) {
        const game = games[key];
        await client.query(
          'INSERT INTO collection_items (collection_id, game_id, added_at) VALUES ($1, $2, $3)',
          [collectionId, game.id, createdAt]
        );
        await log('collection_add_game', createdAt, {
          gameId: game.id, collectionId, details: { name: game.name, collection: seedCollection.name },
        });
      }
    }

    console.log(`✓ Cuenta demo creada: ${DEMO_EMAIL} (usuario ${DEMO_USERNAME})`);
    console.log(`  ${SEED_GAMES.length} juegos, ${SEED_COLLECTIONS.length} colecciones`);
  });
}

try {
  await seed();
} catch (error) {
  console.error('Error en el seed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
