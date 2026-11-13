import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as libraryService from '../services/libraryService';

// Contexto de la biblioteca: la cargamos una vez del backend después del login y
// la compartimos entre Home, Explorar, Detalle y Biblioteca.
// Así cada tarjeta sabe si el juego ya está guardado y en qué estado, sin pedirlo de nuevo.
// La fuente de verdad sigue siendo la base de datos: cada cambio pasa primero por la API.
const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await libraryService.getLibrary());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setItems([]); // al cerrar sesión no queda nada del usuario anterior
  }, [isAuthenticated, refresh]);

  // Mapa gameId -> item para búsquedas rápidas
  const byGameId = useMemo(
    () => items.reduce((map, item) => ({ ...map, [item.game_id]: item }), {}),
    [items]
  );

  const addGame = useCallback(async (gamePayload, status) => {
    const item = await libraryService.addToLibrary(gamePayload, status);
    setItems((current) => [item, ...current]);
    return item;
  }, []);

  const updateGame = useCallback(async (gameId, changes) => {
    const item = await libraryService.updateLibraryItem(gameId, changes);
    setItems((current) => current.map((existing) => (existing.game_id === gameId ? item : existing)));
    return item;
  }, []);

  const removeGame = useCallback(async (gameId) => {
    await libraryService.removeFromLibrary(gameId);
    setItems((current) => current.filter((existing) => existing.game_id !== gameId));
  }, []);

  // Para cuando otra pantalla cambia algo que afecta al item (ej: escribir una reseña)
  const patchLocal = useCallback((gameId, changes) => {
    setItems((current) => current.map((existing) => (existing.game_id === gameId ? { ...existing, ...changes } : existing)));
  }, []);

  const value = useMemo(
    () => ({ items, byGameId, loading, error, refresh, addGame, updateGame, removeGame, patchLocal }),
    [items, byGameId, loading, error, refresh, addGame, updateGame, removeGame, patchLocal]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary debe usarse dentro de <LibraryProvider>');
  return context;
}
