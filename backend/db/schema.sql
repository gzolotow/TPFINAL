-- =========================================================
-- My Collection · Videojuegos — Esquema de base de datos
-- PostgreSQL 14+
-- Ejecutar con: npm run db:schema   (o: psql "$DATABASE_URL" -f db/schema.sql)
-- ¡Borra y recrea todas las tablas!
-- =========================================================

DROP TABLE IF EXISTS activity          CASCADE;
DROP TABLE IF EXISTS collection_items  CASCADE;
DROP TABLE IF EXISTS collections       CASCADE;
DROP TABLE IF EXISTS reviews           CASCADE;
DROP TABLE IF EXISTS library_items     CASCADE;
DROP TABLE IF EXISTS games             CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

-- ---------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------
CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  username            VARCHAR(30)  NOT NULL,
  email               VARCHAR(255) NOT NULL,
  password_hash       TEXT         NOT NULL,
  display_name        VARCHAR(60),
  bio                 VARCHAR(500) NOT NULL DEFAULT '',
  avatar_url          TEXT,
  favorite_genres     TEXT[]       NOT NULL DEFAULT '{}',
  favorite_platforms  TEXT[]       NOT NULL DEFAULT '{}',
  yearly_goal         INTEGER      NOT NULL DEFAULT 12 CHECK (yearly_goal BETWEEN 1 AND 365),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Unicidad sin distinguir mayúsculas
CREATE UNIQUE INDEX users_username_lower_idx ON users (LOWER(username));
CREATE UNIQUE INDEX users_email_lower_idx    ON users (LOWER(email));

-- ---------------------------------------------------------
-- Juegos (copia mínima de los datos de RAWG)
-- El id es el id estable de RAWG. Guardamos lo necesario para
-- reconstruir biblioteca, colecciones y estadísticas sin volver a
-- llamar a la API externa.
-- ---------------------------------------------------------
CREATE TABLE games (
  id          INTEGER PRIMARY KEY,           -- id de RAWG
  slug        VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  cover_url   TEXT,
  released    DATE,
  genres      TEXT[] NOT NULL DEFAULT '{}',
  platforms   TEXT[] NOT NULL DEFAULT '{}',
  metacritic  INTEGER,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- Biblioteca: relación usuario <-> juego con estado, favorito,
-- puntuación y horas jugadas.
-- ---------------------------------------------------------
CREATE TABLE library_items (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id       INTEGER NOT NULL REFERENCES games(id),
  status        VARCHAR(20) NOT NULL DEFAULT 'want_to_play'
                CHECK (status IN ('want_to_play', 'playing', 'completed', 'abandoned')),
  is_favorite   BOOLEAN NOT NULL DEFAULT FALSE,
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  hours_played  NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (hours_played >= 0),
  platform      VARCHAR(60),                 -- plataforma en la que lo juega el usuario
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);
CREATE INDEX library_items_user_status_idx ON library_items (user_id, status);

-- ---------------------------------------------------------
-- Reseñas: una por usuario y juego, y el juego tiene que estar
-- en la biblioteca (si se quita de la biblioteca, se borra la reseña).
-- ---------------------------------------------------------
CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  game_id     INTEGER NOT NULL,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id),
  FOREIGN KEY (user_id, game_id)
    REFERENCES library_items (user_id, game_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- Colecciones y su relación con los juegos (N a N)
-- ---------------------------------------------------------
CREATE TABLE collections (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(80)  NOT NULL,
  description  VARCHAR(300) NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX collections_user_name_idx ON collections (user_id, LOWER(name));

CREATE TABLE collection_items (
  collection_id  INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  game_id        INTEGER NOT NULL REFERENCES games(id),
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, game_id)
);

-- ---------------------------------------------------------
-- Actividad del usuario (historial)
-- game_id y collection_id no tienen FK estricta a propósito:
-- la actividad queda aunque después se borre la colección.
-- ---------------------------------------------------------
CREATE TABLE activity (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           VARCHAR(40) NOT NULL,
  game_id        INTEGER,
  collection_id  INTEGER,
  details        JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_user_created_idx ON activity (user_id, created_at DESC);
