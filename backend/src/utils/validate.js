import { badRequest } from './httpError.js';

export const STATUSES = ['want_to_play', 'playing', 'completed', 'abandoned'];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

// Junta los errores de validación en un objeto { campo: mensaje }
// y, si hay alguno, lanza un 400 con todos juntos.
export function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw badRequest('Datos inválidos', errors);
  }
}

export function parseId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`El ${name} no es válido`);
  return id;
}

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isStringArray = (value, maxItems = 20) =>
  Array.isArray(value) &&
  value.length <= maxItems &&
  value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 60);
