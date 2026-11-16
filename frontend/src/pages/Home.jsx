import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { getFeaturedGames } from '../services/gamesService';
import { getCollections } from '../services/collectionsService';
import { getActivity } from '../services/userService';
import { getErrorMessage } from '../services/api';
import GameCard from '../components/GameCard';
import ActivityList from '../components/ActivityList';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { STATUSES } from '../utils/constants';

export default function Home() {
  const { user } = useAuth();
  const { items, byGameId, loading: libraryLoading } = useLibrary();

  const [featured, setFeatured] = useState([]);
  const [featuredState, setFeaturedState] = useState({ loading: true, error: '' });
  const [collections, setCollections] = useState([]);
  const [activity, setActivity] = useState([]);
  const [personalError, setPersonalError] = useState('');

  const loadFeatured = () => {
    setFeaturedState({ loading: true, error: '' });
    getFeaturedGames()
      .then((games) => {
        setFeatured(games);
        setFeaturedState({ loading: false, error: '' });
      })
      .catch((error) => setFeaturedState({ loading: false, error: getErrorMessage(error, 'No se pudieron cargar los destacados') }));
  };

  useEffect(() => {
    loadFeatured();
    Promise.all([getCollections(), getActivity(6)])
      .then(([cols, act]) => {
        setCollections(cols);
        setActivity(act);
      })
      .catch((error) => setPersonalError(getErrorMessage(error)));
  }, []);

  // Resumen calculado con la biblioteca del contexto
  const summary = useMemo(() => {
    const byStatus = STATUSES.map((status) => ({
      ...status,
      count: items.filter((item) => item.status === status.value).length,
    }));
    const completed = byStatus.find((status) => status.value === 'completed').count;
    return {
      byStatus,
      total: items.length,
      progress: items.length ? Math.round((completed / items.length) * 100) : 0,
      playing: items.filter((item) => item.status === 'playing'),
      favorites: items.filter((item) => item.is_favorite),
    };
  }, [items]);

  return (
    <div className="stack-lg">
      <section className="hero">
        <div>
          <p className="eyebrow">Hola, {user.display_name || user.username} 👋</p>
          <h1>¿A qué jugamos hoy?</h1>
          <p className="muted">Seguí tus partidas, descubrí juegos nuevos y mirá cómo avanza tu biblioteca.</p>
          <div className="hero__actions">
            <Link to="/explore" className="btn btn--primary">Explorar juegos</Link>
            <Link to="/stats" className="btn">Ver mis estadísticas</Link>
          </div>
        </div>
        <div className="hero__progress card">
          <div className="hero__progress-head">
            <span className="muted">Progreso de la biblioteca</span>
            <strong>{summary.progress}%</strong>
          </div>
          <div className="progress"><span style={{ width: `${summary.progress}%` }} /></div>
          <div className="status-grid">
            {summary.byStatus.map((status) => (
              <Link key={status.value} to={`/library?status=${status.value}`} className="status-grid__item" style={{ '--badge-color': status.color }}>
                <strong>{status.count}</strong>
                <span>{status.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ErrorMessage message={personalError} />

      <section>
        <div className="section-head">
          <h2>Jugando ahora</h2>
          <Link to="/library?status=playing">Ver todo</Link>
        </div>
        {libraryLoading ? (
          <Loader />
        ) : summary.playing.length ? (
          <div className="grid grid--cards">
            {summary.playing.slice(0, 6).map((item) => (
              <GameCard key={item.game_id} game={item.game} libraryItem={item} compact />
            ))}
          </div>
        ) : (
          <EmptyState title="No estás jugando nada" icon="🕹️">
            Marcá un juego como «Jugando» desde su detalle.
          </EmptyState>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Destacados en Steam</h2>
          <Link to="/explore">Explorar más</Link>
        </div>
        {featuredState.loading ? (
          <Loader label="Buscando juegos destacados..." />
        ) : featuredState.error ? (
          <ErrorMessage message={featuredState.error} onRetry={loadFeatured} />
        ) : (
          <div className="carousel">
            {featured.map((game) => (
              <GameCard key={game.id} game={game} libraryItem={byGameId[game.id]} compact />
            ))}
          </div>
        )}
      </section>

      <div className="two-cols">
        <section className="card">
          <div className="section-head">
            <h2>Favoritos</h2>
            <Link to="/library?favorite=true">Ver todos</Link>
          </div>
          {summary.favorites.length ? (
            <div className="mini-covers">
              {summary.favorites.slice(0, 8).map((item) => (
                <Link key={item.game_id} to={`/games/${item.game.slug}`} title={item.game.name}>
                  {item.game.cover_url ? <img src={item.game.cover_url} alt={item.game.name} /> : <span>{item.game.name}</span>}
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Marcá juegos con ♥ para verlos acá.</p>
          )}

          <div className="section-head mt">
            <h2>Colecciones</h2>
            <Link to="/collections">Ver todas</Link>
          </div>
          {collections.length ? (
            <ul className="link-list">
              {collections.slice(0, 4).map((collection) => (
                <li key={collection.id}>
                  <Link to={`/collections/${collection.id}`}>{collection.name}</Link>
                  <span className="muted small">{collection.game_count} juegos</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Todavía no creaste colecciones.</p>
          )}
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Actividad reciente</h2>
            <Link to="/profile">Ver perfil</Link>
          </div>
          <ActivityList activity={activity} />
        </section>
      </div>
    </div>
  );
}