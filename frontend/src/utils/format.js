import { STATUS_BY_VALUE } from './constants';

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  const units = [
    ['año', 31536000], ['mes', 2592000], ['semana', 604800], ['día', 86400], ['hora', 3600], ['minuto', 60],
  ];
  for (const [unit, size] of units) {
    const amount = Math.floor(seconds / size);
    if (amount >= 1) {
      const plural = amount > 1 ? (unit === 'mes' ? 'es' : 's') : '';
      return `hace ${amount} ${unit}${plural}`;
    }
  }
  return 'recién';
}

export const releaseYear = (released) => (released ? released.slice(0, 4) : 'Sin fecha');

const statusLabel = (value) => STATUS_BY_VALUE[value]?.label ?? value;

// Texto legible para cada tipo de actividad que guarda el backend
export function describeActivity({ type, details = {} }) {
  const name = details.name ?? 'un juego';
  switch (type) {
    case 'library_add': return `Agregó ${name} a su biblioteca`;
    case 'library_remove': return `Quitó ${name} de su biblioteca`;
    case 'status_change': return `Pasó ${name} a «${statusLabel(details.to)}»`;
    case 'favorite_add': return `Marcó ${name} como favorito`;
    case 'favorite_remove': return `Quitó ${name} de favoritos`;
    case 'rating_set': return `Puntuó ${name} con ${'★'.repeat(details.rating ?? 0)}`;
    case 'rating_remove': return `Quitó la puntuación de ${name}`;
    case 'hours_update': return `Registró ${details.hours} h en ${name}`;
    case 'platform_set': return `Juega ${name} en ${details.platform}`;
    case 'review_create': return `Escribió una reseña de ${name}`;
    case 'review_update': return `Editó su reseña de ${name}`;
    case 'review_delete': return `Borró su reseña de ${name}`;
    case 'collection_create': return `Creó la colección «${details.name}»`;
    case 'collection_update': return `Editó la colección «${details.name}»`;
    case 'collection_delete': return `Borró la colección «${details.name}»`;
    case 'collection_add_game': return `Agregó ${name} a «${details.collection}»`;
    case 'collection_remove_game': return `Quitó ${name} de «${details.collection}»`;
    case 'profile_update': return 'Actualizó su perfil';
    default: return 'Actividad';
  }
}

// Quita etiquetas HTML de la descripción de Steam
export const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
