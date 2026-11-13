import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { getFeaturedGames, PLATFORM_FILTERS, searchGames, SORTS, toGamePayload } from '../services/gamesService';
import { getErrorMessage } from '../services/api';
import { GENRE_OPTIONS } from '../utils/constants';
import useDebounce from '../hooks/useDebounce';
import GameCard from '../components/GameCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

export default function Explore() {
  const { byGameId, addGame } = useLibrary();
  // Los filtros viven en la URL: se pueden compartir y sobreviven a recargar la página
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const genre = params.get('genre') ?? '';
  const platform = params.get('platform') ?? '';
  const sort = params.get('sort') ?? 'relevance';
  const debouncedSearch = useDebounce(search.trim(), 450);
  const isSearching = debouncedSearch.length >= 2;

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Guardar la búsqueda en la URL cuando termina de escribir
  useEffect(() => {
    updateParam('q', debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sin texto mostramos los destacados; con texto, buscamos en Steam con filtros y orden
  useEffect(() => {
    let ignore = false; // evita mostrar resultados viejos si llegan tarde
    setLoading(true);
    setError('');
    const request = isSearching
      ? searchGames({ search: debouncedSearch, platform, genre, sort })
      : getFeaturedGames();
    request
      .then((results) => !ignore && setGames(results))
      .catch((err) => !ignore && setError(getErrorMessage(err, 'No se pudo consultar Steam')))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [debouncedSearch, isSearching, platform, genre, sort, reloadKey]);

  const quickAdd = async (game) => {
    setAddingId(game.id);
    try {
      await addGame(toGamePayload(game), 'want_to_play');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAddingId(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setParams({}, { replace: true });
  };

  const hasFilters = search || genre || platform || sort !== 'relevance';

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Explorar</h1>
        <p className="muted">Buscá en el catálogo de Steam y agregá juegos a tu biblioteca.</p>
      </div>

      <div className="filters card">
        <input
          className="filters__search"
          type="search"
          placeholder="Buscar juegos por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar juegos"
        />
        <select value={genre} onChange={(e) => updateParam('genre', e.target.value)} aria-label="Género" disabled={!isSearching}>
          <option value="">Todos los géneros</option>
          {GENRE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={platform} onChange={(e) => updateParam('platform', e.target.value)} aria-label="Sistema operativo" disabled={!isSearching}>
          <option value="">Todos los sistemas</option>
          {PLATFORM_FILTERS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={sort} onChange={(e) => updateParam('sort', e.target.value === 'relevance' ? '' : e.target.value)} aria-label="Ordenar por" disabled={!isSearching}>
          {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {hasFilters && <button className="btn btn--ghost btn--sm" onClick={clearFilters}>Limpiar</button>}
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setReloadKey((key) => key + 1)} />}

      {loading ? (
        <Loader label={isSearching ? 'Buscando en Steam...' : 'Cargando destacados...'} />
      ) : games.length === 0 && !error ? (
        <EmptyState title="Sin resultados" icon="🔍">Probá con otro nombre o sacá algún filtro.</EmptyState>
      ) : (
        <>
          <p className="muted small">
            {isSearching ? `${games.length} resultados para «${debouncedSearch}»` : 'Más vendidos y novedades de Steam. Escribí para buscar y usar los filtros.'}
          </p>
          <div className="grid grid--cards">
            {games.map((game) => {
              const item = byGameId[game.id];
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  libraryItem={item}
                  actions={
                    item ? (
                      <span className="muted small">✓ En tu biblioteca</span>
                    ) : (
                      <button className="btn btn--sm btn--block" disabled={addingId === game.id} onClick={() => quickAdd(game)}>
                        {addingId === game.id ? 'Agregando...' : '+ Quiero jugar'}
                      </button>
                    )
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
