import { useEffect, useState } from 'react';
import Modal from './Modal';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import * as collectionsService from '../services/collectionsService';
import { getErrorMessage } from '../services/api';

// Elegir una colección (o crear una nueva) para agregar el juego
export default function AddToCollectionModal({ game, onClose }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    collectionsService
      .getCollections()
      .then(setCollections)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const addTo = async (collection) => {
    setBusyId(collection.id);
    setError('');
    try {
      await collectionsService.addGameToCollection(collection.id, game);
      setFeedback(`Agregado a «${collection.name}»`);
      setCollections((list) =>
        list.map((item) => (item.id === collection.id ? { ...item, game_count: item.game_count + 1 } : item))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const createAndAdd = async (event) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setError('');
    try {
      const created = await collectionsService.createCollection({ name: newName.trim(), description: '' });
      setCollections((list) => [created, ...list]);
      setNewName('');
      await addTo(created);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal title={`Agregar «${game.name}» a una colección`} onClose={onClose}>
      {loading ? (
        <Loader />
      ) : (
        <>
          <ErrorMessage message={error} />
          {feedback && <div className="alert alert--success">{feedback}</div>}
          {collections.length === 0 && <p className="muted">Todavía no tenés colecciones. Creá la primera:</p>}
          <ul className="pick-list">
            {collections.map((collection) => (
              <li key={collection.id}>
                <span>
                  {collection.name} <span className="muted small">({collection.game_count})</span>
                </span>
                <button className="btn btn--sm" disabled={busyId === collection.id} onClick={() => addTo(collection)}>
                  {busyId === collection.id ? 'Agregando...' : 'Agregar'}
                </button>
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={createAndAdd}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nueva colección"
              maxLength={80}
              aria-label="Nombre de la nueva colección"
            />
            <button className="btn btn--primary btn--sm" disabled={!newName.trim()}>Crear y agregar</button>
          </form>
        </>
      )}
    </Modal>
  );
}
