import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import activityRoutes from './routes/activity.js';
import gamesRoutes from './routes/games.js';
import libraryRoutes from './routes/library.js';

const app = express();

// Detrás de Render/Vercel hay un proxy: esto hace que Express respete HTTPS para las cookies Secure
app.set('trust proxy', 1);

// CORS: solo el frontend configurado puede llamar a la API con cookies
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
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
app.use('/api/activity', requireAuth, activityRoutes);
app.use('/api/games', requireAuth, gamesRoutes);
app.use('/api/library', requireAuth, libraryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;