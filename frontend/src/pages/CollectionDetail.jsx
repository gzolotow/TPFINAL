import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import * as collectionsService from '../services/collectionsService';
import { getErrorMessage } from '../services/api';
import { formatDate } from '../utils/format';
import GameCard from '../components/GameCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import CollectionForm from '../components/CollectionForm';

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items: libraryItems, byGameId } = useLibrary();

  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    collectionsService
      .getCollection(id)
      .then(setCollection)
      .catch((err) => setError(err.response?.status === 404 ? 'Esta colección no existe o no es tuya.' : getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  // Juegos de la biblioteca que todavía no están en la colección
  const candidates = useMemo(() => {
    if (!collection) return [];
    const inCollection = new Set(collection.games.map((game) => game.id));
    const text = filter.trim().toLowerCase();
    return libraryItems
      .filter((item) => !inCollection.has(item.game_id))
      .filter((item) => !text || item.game.name.toLowerCase().includes(text));
  }, [collection, libraryItems, filter]);

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="stack">
        <ErrorMessage message={error} />
        <Link to="/collections" className="btn">Volver a colecciones</Link>
      </div>
    );
  }

  const handleEdit = async (data) => {
    const updated = await collectionsService.updateCollection(collection.id, data);
    setCollection((current) => ({ ...current, ...updated }));
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Borrar «${collection.name}»?`)) return;
    try {
      await collectionsService.deleteCollection(collection.id);
      navigate('/collections', { replace: true });
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const handleRemoveGame = async (game) => {
    setActionError('');
    try {
      await collectionsService.removeGameFromCollection(collection.id, game.id);
      setCollection((current) => ({ ...current, games: current.games.filter((item) => item.id !== game.id) }));
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const handleAddGame = async (item) => {
    setActionError('');
    try {
      await collectionsService.addGameToCollection(collection.id, item.game);
      setCollection((current) => ({
        ...current,
        games: [{ ...item.game, added_at: new Date().toISOString(), status: item.status, rating: item.rating }, ...current.games],
      }));
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  return (
    <div className="stack">
      <Link to="/collections" className="muted small">← Colecciones</Link>
      <div className="page-head row-between">
        <div>
          <h1>{collection.name}</h1>
          {collection.description && <p className="muted">{collection.description}</p>}
          <p className="muted small">{collection.games.length} juegos · creada el {formatDate(collection.created_at)}</p>
        </div>
        <div className="row">
          <button className="btn btn--primary" onClick={() => setAdding(true)}>+ Agregar juegos</button>
          <button className="btn" onClick={() => setEditing(true)}>Editar</button>
          <button className="btn btn--ghost btn--danger" onClick={handleDelete}>Borrar</button>
        </div>
      </div>

      <ErrorMessage message={actionError} />

      {collection.games.length === 0 ? (
        <EmptyState title="La colección está vacía" icon="🗂️">
          Agregá juegos de tu biblioteca o desde el detalle de cualquier juego.
        </EmptyState>
      ) : (
        <div className="grid grid--cards">
          {collection.games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              libraryItem={byGameId[game.id]}
              actions={<button className="btn btn--sm btn--ghost btn--block" onClick={() => handleRemoveGame(game)}>Quitar de la colección</button>}
            />
          ))}
        </div>
      )}

      {editing && (
        <Modal title="Editar colección" onClose={() => setEditing(false)}>
          <CollectionForm initial={collection} onSubmit={handleEdit} onCancel={() => setEditing(false)} />
        </Modal>
      )}

      {adding && (
        <Modal title="Agregar desde tu biblioteca" onClose={() => setAdding(false)}>
          <input type="search" placeholder="Filtrar..." value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar juegos" />
          {candidates.length === 0 ? (
            <p className="muted mt">No hay más juegos para agregar. Podés sumar cualquiera desde Explorar.</p>
          ) : (
            <ul className="pick-list">
              {candidates.map((item) => (
                <li key={item.game_id}>
                  <span>{item.game.name}</span>
                  <button className="btn btn--sm" onClick={() => handleAddGame(item)}>Agregar</button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
