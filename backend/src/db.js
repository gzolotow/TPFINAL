import pg from 'pg';
import 'dotenv/config';

const { Pool, types } = pg;

// Por defecto pg devuelve NUMERIC como string y DATE como objeto Date con zona horaria.
// Los convertimos a number y a 'YYYY-MM-DD' para que el frontend reciba datos simples.
types.setTypeParser(1700, (value) => (value === null ? null : Number(value))); // NUMERIC
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));   // BIGINT (COUNT)
types.setTypeParser(1082, (value) => value);                                    // DATE

if (!process.env.DATABASE_URL) {
  console.error('Falta la variable de entorno DATABASE_URL (ver .env.example)');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Atajo para consultas simples
export const query = (text, params) => pool.query(text, params);

// Ejecuta varias consultas dentro de una transacción.
// Si algo falla se hace ROLLBACK y no queda nada a medias.
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
