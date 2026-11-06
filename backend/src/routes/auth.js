import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken, cookieOptions, COOKIE_NAME } from '../middleware/auth.js';
import { asyncHandler, conflict, unauthorized } from '../utils/httpError.js';
import { assertValid, EMAIL_REGEX, USERNAME_REGEX } from '../utils/validate.js';

const router = Router();

// Columnas del usuario que se pueden mostrar (nunca password_hash)
export const PUBLIC_USER_COLUMNS = `id, username, email, display_name, bio, avatar_url,
  favorite_genres, favorite_platforms, yearly_goal, created_at`;

function setAuthCookie(res, token) {
  const days = parseInt(process.env.JWT_EXPIRES_IN, 10) || 7;
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: days * 24 * 60 * 60 * 1000 });
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password, confirmPassword } = req.body ?? {};
    const errors = {};

    if (typeof username !== 'string' || !USERNAME_REGEX.test(username.trim())) {
      errors.username = 'Entre 3 y 30 caracteres: letras, números, punto o guion bajo';
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Ingresá un correo válido';
    }
    if (typeof password !== 'string' || password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = 'La contraseña debe tener letras y números';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    assertValid(errors);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existing = await query(
      'SELECT LOWER(username) AS username, LOWER(email) AS email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = $2',
      [cleanUsername, cleanEmail]
    );
    if (existing.rows.some((row) => row.email === cleanEmail)) {
      throw conflict('Ya existe una cuenta con ese correo');
    }
    if (existing.rows.length > 0) {
      throw conflict('Ese nombre de usuario ya está en uso');
    }

    // bcrypt con 10 rondas de "salt": el hash es distinto aunque dos usuarios usen la misma contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $1)
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      [cleanUsername, cleanEmail, passwordHash]
    );
    const user = rows[0];

    setAuthCookie(res, signToken(user));
    res.status(201).json({ user });
  })
);

// POST /api/auth/login  (se puede entrar con correo o con nombre de usuario)
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body ?? {};
    const errors = {};
    if (typeof identifier !== 'string' || !identifier.trim()) errors.identifier = 'Ingresá tu correo o usuario';
    if (typeof password !== 'string' || !password) errors.password = 'Ingresá tu contraseña';
    assertValid(errors);

    const { rows } = await query(
      `SELECT ${PUBLIC_USER_COLUMNS}, password_hash FROM users
       WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)`,
      [identifier.trim()]
    );
    const found = rows[0];

    // Mismo mensaje para "no existe" y "contraseña mal": no revelamos qué cuentas existen
    if (!found || !(await bcrypt.compare(password, found.password_hash))) {
      throw unauthorized('Correo/usuario o contraseña incorrectos');
    }

    const { password_hash: _omit, ...user } = found;
    setAuthCookie(res, signToken(user));
    res.json({ user });
  })
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
});

// GET /api/auth/me  -> usuario de la sesión actual
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
    res.json({ user: rows[0] });
  })
);

export default router;
