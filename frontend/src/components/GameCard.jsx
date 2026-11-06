import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import StarRating from './StarRating';
import { releaseYear } from '../utils/format';

// Tarjeta reutilizable. Recibe el juego en el formato de nuestro backend
// ({ id, slug, name, cover_url, released, genres }) y opcionalmente el item de la biblioteca.
export default function GameCard({ game, libraryItem, actions, compact = false }) {
  return (
    <article className={`game-card ${compact ? 'game-card--compact' : ''}`}>
      <Link to={`/games/${game.slug}`} className="game-card__cover">
        {game.cover_url ? (
          <img src={game.cover_url} alt="" loading="lazy" />
        ) : (
          <div className="game-card__placeholder" aria-hidden="true">🎮</div>
        )}
        {libraryItem?.is_favorite && <span className="game-card__fav" title="Favorito">♥</span>}
        {libraryItem && (
          <span className="game-card__status">
            <StatusBadge status={libraryItem.status} />
          </span>
        )}
      </Link>
      <div className="game-card__body">
        <Link to={`/games/${game.slug}`} className="game-card__title">{game.name}</Link>
        <div className="game-card__meta">
          <span>{releaseYear(game.released)}</span>
          {game.genres?.length > 0 && <span>· {game.genres.slice(0, 2).join(', ')}</span>}
        </div>
        {libraryItem?.rating ? <StarRating value={libraryItem.rating} readOnly size="sm" /> : null}
        {actions && <div className="game-card__actions">{actions}</div>}
      </div>
    </article>
  );
}
