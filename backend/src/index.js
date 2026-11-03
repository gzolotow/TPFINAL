import 'dotenv/config';
import app from './app.js';
import { pool } from './db.js';

if (!process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET (ver .env.example)');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

// Probamos la conexión a la base antes de levantar el servidor
try {
  await pool.query('SELECT 1');
  app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
} catch (error) {
  console.error('No se pudo conectar a PostgreSQL:', error.message);
  process.exit(1);
}
