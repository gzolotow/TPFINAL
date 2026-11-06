import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { unauthorized, asyncHandler } from '../utils/httpError.js';

export const COOKIE_NAME = 'mc_token';

// Opciones de la cookie donde guardamos el JWT.
// httpOnly: JavaScript del navegador no la puede leer (protege contra XSS).
// secure: solo viaja por HTTPS (en producción).
// sameSite 'lax': no se manda en requests de otros sitios (protege contra CSRF).
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Middleware que protege las rutas privadas.
// Lee el token de la cookie (o del header Authorization: Bearer, útil para probar con Postman),
// verifica firma y expiración, y deja el usuario en req.user.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token =
    req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);

  if (!token) throw unauthorized('Tenés que iniciar sesión');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw unauthorized(
      error.name === 'TokenExpiredError' ? 'Tu sesión expiró, volvé a iniciar sesión' : 'Token inválido'
    );
  }

  // Verificamos que el usuario siga existiendo
  const { rows } = await query('SELECT id, username FROM users WHERE id = $1', [payload.sub]);
  if (rows.length === 0) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    throw unauthorized('El usuario ya no existe');
  }

  req.user = rows[0];
  next();
});
