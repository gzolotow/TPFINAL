// Estados de la temática Videojuegos (los mismos valores que valida el backend)
export const STATUSES = [
  { value: 'want_to_play', label: 'Quiero jugar', short: 'Quiero jugar', color: 'var(--status-want)' },
  { value: 'playing', label: 'Jugando', short: 'Jugando', color: 'var(--status-playing)' },
  { value: 'completed', label: 'Terminado', short: 'Terminado', color: 'var(--status-completed)' },
  { value: 'abandoned', label: 'Abandonado', short: 'Abandonado', color: 'var(--status-abandoned)' },
];

export const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map((status) => [status.value, status]));

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Géneros tal como los devuelve Steam en español
export const GENRE_OPTIONS = [
  'Acción', 'Aventura', 'Rol', 'Estrategia', 'Indie', 'Simuladores', 'Casual',
  'Deportes', 'Carreras', 'Multijugador masivo', 'Free to Play',
];

// Dónde juega el usuario cada juego (lo elige él, no viene de Steam)
export const PLATFORM_OPTIONS = [
  'PC', 'Steam Deck', 'PlayStation 5', 'PlayStation 4', 'Xbox Series S/X', 'Xbox One', 'Nintendo Switch', 'iOS', 'Android',
];
