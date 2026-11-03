import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

// Manejador central de errores: todas las respuestas de error tienen la forma
// { error: 'mensaje', details?: { campo: 'mensaje' } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // JSON mal formado en el body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  }

  // Errores conocidos de PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'El registro ya existe' });
  if (err.code === '23503') return res.status(400).json({ error: 'Referencia inválida' });
  if (err.code === '23514') return res.status(400).json({ error: 'Valor fuera de rango' });
  if (err.code === '22P02') return res.status(400).json({ error: 'Formato de dato inválido' });

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
