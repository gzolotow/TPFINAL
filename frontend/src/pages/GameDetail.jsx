import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { getGameDetail, toGamePayload } from '../services/gamesService';
import * as reviewsService from '../services/reviewsService';
import { getErrorMessage } from '../services/api';
import { PLATFORM_OPTIONS, STATUSES } from '../utils/constants';
import { formatDate, stripHtml } from '../utils/format';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import StarRating from '../components/StarRating';
import AddToCollectionModal from '../components/AddToCollectionModal';
import ReviewEditor from '../components/ReviewEditor';

export default function GameDetail() {
  const { slug } = useParams();
  const { byGameId, addGame, updateGame, removeGame, patchLocal } = useLibrary();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState('want_to_play');
  const [hours, setHours] = useState('');
  const [showCollections, setShowCollections] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [review, setReview] = useState(null);

  // Detalle desde la API externa (Steam, a través de nuestro backend)
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError('');
    getGameDetail(slug)
      .then((data) => !ignore && setDetail(data))
      .catch((error) => {
        if (ignore) return;
        setLoadError(error.response?.status === 404 ? 'No encontramos ese juego.' : getErrorMessage(error, 'No se pudo cargar el juego'));
      })
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [slug]);

  const item = detail ? byGameId[detail.id] : null;

  // Horas jugadas y reseña: datos propios desde nuestro backend
  useEffect(() => {
    setHours(item ? String(item.hours_played) : '');
  }, [item?.hours_played]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!item) {
      setReview(null);
      return;
    }
    reviewsService.getReview(item.game_id).then(setReview).catch(() => setReview(null));
  }, [item?.game_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ejecuta una acción mostrando "guardando" y el error si falla
  const run = async (action) => {
    setSaving(true);
    setActionError('');
    try {
      await action();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Cargando juego..." />;
  if (loadError) {
    return (
      <div className="stack">
        <ErrorMessage message={loadError} />
        <Link to="/explore" className="btn">Volver a Explorar</Link>
      </div>
    );
  }

  const game = toGamePayload(detail);
  const screenshots = detail.screenshots ?? [];
  const description = stripHtml(detail.about || detail.description || '');
  const shortDescription = description.length > 600 && !showFullDescription ? `${description.slice(0, 600)}…` : description;

  const handleRemove = () => {
    if (window.confirm(`¿Quitar «${game.name}» de tu biblioteca? También se borra tu reseña.`)) {
      run(() => removeGame(game.id));
    }
  };

  const saveHours = () => {
    const value = Number(hours);
    if (!Number.isFinite(value) || value < 0) {
      setActionError('Las horas tienen que ser un número positivo');
      return;
    }
    if (value !== item.hours_played) run(() => updateGame(game.id, { hours_played: value }));
  };

  return (
    <div className="detail">
      <div className="detail__backdrop" style={{ backgroundImage: game.cover_url ? `url(${game.cover_url})` : 'none' }} />

      <div className="detail__layout">
        <div className="detail__cover">
          {game.cover_url ? <img src={game.cover_url} alt={game.name} /> : <div className="game-card__placeholder">🎮</div>}
        </div>

        <div className="detail__info">
          <Link to="/explore" className="muted small">← Explorar</Link>
          <h1>{game.name}</h1>
          <div className="chips">
            {game.genres.map((genre) => <span key={genre} className="chip">{genre}</span>)}
          </div>

          <dl className="meta-grid">
            <div><dt>Lanzamiento</dt><dd>{formatDate(game.released)}</dd></div>
            <div><dt>Metacritic</dt><dd>{game.metacritic ?? '—'}</dd></div>
            <div><dt>Precio en Steam</dt><dd>{detail.price ?? '—'}</dd></div>
            <div><dt>Sistemas</dt><dd>{game.platforms.join(', ') || '—'}</dd></div>
            <div><dt>Desarrollador</dt><dd>{detail.developers.join(', ') || '—'}</dd></div>
            <div><dt>Editor</dt><dd>{detail.publishers.join(', ') || '—'}</dd></div>
          </dl>
          {detail.description && <p className="prose">{detail.description}</p>}
          {detail.coming_soon && <p className="small muted">Todavía no salió.</p>}
        </div>

        {/* Panel de acciones del usuario */}
        <aside className="detail__actions card">
          <ErrorMessage message={actionError} />

          {!item ? (
            <div className="stack-sm">
              <h3>Agregar a tu biblioteca</h3>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} aria-label="Estado inicial">
                {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <button className="btn btn--primary btn--block" disabled={saving} onClick={() => run(() => addGame(game, newStatus))}>
                {saving ? 'Agregando...' : '+ Agregar a biblioteca'}
              </button>
            </div>
          ) : (
            <div className="stack-sm">
              <div className="row-between">
                <h3>En tu biblioteca</h3>
                <button
                  className={`icon-btn icon-btn--fav ${item.is_favorite ? 'is-active' : ''}`}
                  disabled={saving}
                  onClick={() => run(() => updateGame(game.id, { is_favorite: !item.is_favorite }))}
                  aria-pressed={item.is_favorite}
                  title={item.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                >
                  ♥
                </button>
              </div>

              <label className="label">Estado</label>
              <div className="segmented">
                {STATUSES.map((status) => (
                  <button
                    key={status.value}
                    className={item.status === status.value ? 'is-active' : ''}
                    style={{ '--badge-color': status.color }}
                    disabled={saving}
                    onClick={() => item.status !== status.value && run(() => updateGame(game.id, { status: status.value }))}
                  >
                    {status.label}
                  </button>
                ))}
              </div>

              <label className="label">Tu puntuación</label>
              <StarRating value={item.rating} onChange={(rating) => run(() => updateGame(game.id, { rating }))} size="lg" />

              <div className="two-inputs">
                <div>
                  <label className="label" htmlFor="hours">Horas jugadas</label>
                  <input id="hours" type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} onBlur={saveHours} />
                </div>
                <div>
                  <label className="label" htmlFor="platform">Lo juego en</label>
                  <select
                    id="platform"
                    value={item.platform ?? ''}
                    onChange={(e) => run(() => updateGame(game.id, { platform: e.target.value || null }))}
                  >
                    <option value="">Elegí plataforma</option>
                    {PLATFORM_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>

              {item.completed_at && <p className="small muted">Terminado el {formatDate(item.completed_at)}</p>}

              <button className="btn btn--ghost btn--danger btn--sm" disabled={saving} onClick={handleRemove}>
                Quitar de la biblioteca
              </button>
            </div>
          )}

          <hr />
          <button className="btn btn--block" onClick={() => setShowCollections(true)}>+ Agregar a colección</button>
        </aside>
      </div>

      <section className="detail__section">
        <h2>Descripción</h2>
        <p className="prose">{shortDescription || 'Sin descripción disponible.'}</p>
        {description.length > 600 && (
          <button className="link-btn" onClick={() => setShowFullDescription((value) => !value)}>
            {showFullDescription ? 'Ver menos' : 'Leer más'}
          </button>
        )}
      </section>

      {screenshots.length > 0 && (
        <section className="detail__section">
          <h2>Capturas</h2>
          <div className="screenshots">
            {screenshots.map((shot) => <img key={shot.id} src={shot.image} alt={`Captura de ${game.name}`} loading="lazy" />)}
          </div>
        </section>
      )}

      <section className="detail__section">
        <h2>Tu reseña</h2>
        {item ? (
          <ReviewEditor
            gameId={game.id}
            review={review}
            onSaved={(saved) => {
              setReview(saved);
              patchLocal(game.id, { has_review: Boolean(saved) });
            }}
          />
        ) : (
          <p className="muted">Agregá el juego a tu biblioteca para poder reseñarlo.</p>
        )}
      </section>

      {showCollections && <AddToCollectionModal game={game} onClose={() => setShowCollections(false)} />}
    </div>
  );
}