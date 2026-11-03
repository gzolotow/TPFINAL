// Crea (o recrea) todas las tablas ejecutando schema.sql.
// Uso: npm run db:schema
import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(sql);
  console.log('Esquema creado correctamente');
} catch (error) {
  console.error('Error creando el esquema:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
