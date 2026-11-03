import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import libraryRoutes from './routes/library.js';
import reviewsRoutes from './routes/reviews.js';
import collectionsRoutes from './routes/collections.js';
import activityRoutes from './routes/activity.js';
import statsRoutes from './routes/stats.js';

const app = express();

// Detrás de Render/Vercel hay un proxy: esto hace que Express respete HTTPS para las cookies Secure
app.set('trust proxy', 1);

// CORS: solo el frontend configurado puede llamar a la API con cookies.
// En producción el frontend llama a /api por el mismo dominio (rewrite de Vercel),
// pero dejamos CORS bien configurado igual por si se usa la URL directa del backend.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin = Postman, curl o mismo origen
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas privadas: todas pasan por requireAuth
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/library', requireAuth, libraryRoutes);
app.use('/api/reviews', requireAuth, reviewsRoutes);
app.use('/api/collections', requireAuth, collectionsRoutes);
app.use('/api/activity', requireAuth, activityRoutes);
app.use('/api/stats', requireAuth, statsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
