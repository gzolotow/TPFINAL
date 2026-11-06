// Registra una acción del usuario en la tabla activity.
// Se llama dentro de la misma transacción que el cambio, así nunca queda
// un cambio sin su actividad (ni una actividad de un cambio que falló).
export async function logActivity(db, userId, type, { gameId = null, collectionId = null, details = {} } = {}) {
  await db.query(
    `INSERT INTO activity (user_id, type, game_id, collection_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, gameId, collectionId, details]
  );
}
