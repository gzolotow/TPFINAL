import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as collectionsService from '../services/collectionsService';
import { getErrorMessage } from '../services/api';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import CollectionForm from '../components/CollectionForm';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    collectionsService
      .getCollections()
      .then(setCollections)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (data) => {
    const created = await collectionsService.createCollection(data);
    setCollections((list) => [created, ...list]);
    setCreating(false);
  };

  const handleDelete = async (collection) => {
    if (!window.confirm(`¿Borrar la colección «${collection.name}»? Los juegos siguen en tu biblioteca.`)) return;
    try {
      await collectionsService.deleteCollection(collection.id);
      setCollections((list) => list.filter((item) => item.id !== collection.id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>Colecciones</h1>
          <p className="muted">Agrupá tus juegos como quieras: sagas, pendientes, favoritos de un género...</p>
        </div>
        <button className="btn btn--primary" onClick={() => setCreating(true)}>+ Nueva colección</button>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <Loader />
      ) : collections.length === 0 ? (
        <EmptyState title="Todavía no tenés colecciones" icon="🗂️">
          <button className="btn btn--primary" onClick={() => setCreating(true)}>Crear la primera</button>
        </EmptyState>
      ) : (
        <div className="grid grid--collections">
          {collections.map((collection) => (
            <article key={collection.id} className="collection-card">
              <Link to={`/collections/${collection.id}`} className="collection-card__covers">
                {[0, 1, 2, 3].map((index) =>
                  collection.covers[index] ? (
                    <img key={index} src={collection.covers[index]} alt="" loading="lazy" />
                  ) : (
                    <span key={index} />
                  )
                )}
              </Link>
              <div className="collection-card__body">
                <Link to={`/collections/${collection.id}`} className="collection-card__title">{collection.name}</Link>
                <p className="muted small">{collection.game_count} {collection.game_count === 1 ? 'juego' : 'juegos'}</p>
                {collection.description && <p className="small clamp-2">{collection.description}</p>}
              </div>
              <button className="icon-btn collection-card__delete" onClick={() => handleDelete(collection)} title="Borrar colección" aria-label={`Borrar ${collection.name}`}>🗑</button>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="Nueva colección" onClose={() => setCreating(false)}>
          <CollectionForm onSubmit={handleCreate} onCancel={() => setCreating(false)} submitLabel="Crear" />
        </Modal>
      )}
    </div>
  );
}

