// Error con código HTTP. Lo lanzamos desde las rutas y lo atrapa el errorHandler.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'No autenticado') => new HttpError(401, message);
export const notFound = (message = 'No encontrado') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

// Express 4 no captura errores de funciones async: este wrapper los pasa a next().
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
