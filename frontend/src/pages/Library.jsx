import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { getErrorMessage } from '../services/api';
import { STATUSES } from '../utils/constants';
import GameCard from '../components/GameCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

const SORTS = {
  recent: { label: 'Últimos cambios', compare: (a, b) => new Date(b.updated_at) - new Date(a.updated_at) },
  name: { label: 'Nombre', compare: (a, b) => a.game.name.localeCompare(b.game.name) },
  rating: { label: 'Mi puntuación', compare: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) },
  hours: { label: 'Horas jugadas', compare: (a, b) => b.hours_played - a.hours_played },
  released: { label: 'Lanzamiento', compare: (a, b) => (b.game.released ?? '').localeCompare(a.game.released ?? '') },
};

export default function Library() {
  const { items, loading, error, refresh, updateGame, removeGame } = useLibrary();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const onlyFavorites = params.get('favorite') === 'true';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'recent';
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState('');

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Cantidad por estado para las pestañas
  const counts = useMemo(
    () => items.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] ?? 0) + 1 }), {}),
    [items]
  );

  // Filtros y orden sobre la biblioteca que ya está en el contexto
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items
      .filter((item) => !status || item.status === status)
      .filter((item) => !onlyFavorites || item.is_favorite)
      .filter((item) => !text || item.game.name.toLowerCase().includes(text))
      .sort(SORTS[sort].compare);
  }, [items, status, onlyFavorites, query, sort]);

  const act = async (action) => {
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const handleRemove = (item) => {
    if (window.confirm(`¿Quitar «${item.game.name}» de tu biblioteca?`)) act(() => removeGame(item.game_id));
  };

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>Mi biblioteca</h1>
          <p className="muted">{items.length} juegos · {items.filter((item) => item.is_favorite).length} favoritos</p>
        </div>
        <Link to="/explore" className="btn btn--primary">+ Agregar juegos</Link>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={!status} className={!status ? 'is-active' : ''} onClick={() => setParam('status', '')}>
          Todos <span>{items.length}</span>
        </button>
        {STATUSES.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={status === option.value}
            className={status === option.value ? 'is-active' : ''}
            style={{ '--badge-color': option.color }}
            onClick={() => setParam('status', option.value)}
          >
            {option.label} <span>{counts[option.value] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="filters card">
        <input type="search" className="filters__search" placeholder="Buscar en mi biblioteca..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en mi biblioteca" />
        <label className="checkbox">
          <input type="checkbox" checked={onlyFavorites} onChange={(e) => setParam('favorite', e.target.checked ? 'true' : '')} />
          Solo favoritos ♥
        </label>
        <select value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Ordenar">
          {Object.entries(SORTS).map(([value, option]) => <option key={value} value={value}>Ordenar: {option.label}</option>)}
        </select>
      </div>

      {error && <ErrorMessage message={getErrorMessage(error)} onRetry={refresh} />}
      <ErrorMessage message={actionError} />

      {loading && items.length === 0 ? (
        <Loader />
      ) : items.length === 0 ? (
        <EmptyState title="Tu biblioteca está vacía" icon="📚">
          <Link to="/explore" className="btn btn--primary">Explorar juegos</Link>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title="Nada coincide con los filtros" icon="🔍" />
      ) : (
        <div className="grid grid--cards">
          {visible.map((item) => (
            <GameCard
              key={item.game_id}
              game={item.game}
              libraryItem={item}
              actions={
                <>
                  <select
                    value={item.status}
                    onChange={(e) => act(() => updateGame(item.game_id, { status: e.target.value }))}
                    aria-label={`Estado de ${item.game.name}`}
                  >
                    {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <div className="row">
                    <button
                      className={`icon-btn icon-btn--fav ${item.is_favorite ? 'is-active' : ''}`}
                      onClick={() => act(() => updateGame(item.game_id, { is_favorite: !item.is_favorite }))}
                      aria-pressed={item.is_favorite}
                      title="Favorito"
                    >♥</button>
                    <button className="icon-btn" onClick={() => handleRemove(item)} title="Quitar" aria-label={`Quitar ${item.game.name}`}>🗑</button>
                  </div>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}