import { Link } from 'react-router-dom';
import { describeActivity, timeAgo } from '../utils/format';

export default function ActivityList({ activity }) {
  if (!activity?.length) return <p className="muted">Todavía no hay actividad.</p>;
  return (
    <ul className="activity-list">
      {activity.map((entry) => (
        <li key={entry.id} className="activity-item">
          <div className="activity-item__thumb">
            {entry.game_cover ? <img src={entry.game_cover} alt="" loading="lazy" /> : <span aria-hidden="true">•</span>}
          </div>
          <div>
            {entry.game_slug ? (
              <Link to={`/games/${entry.game_slug}`}>{describeActivity(entry)}</Link>
            ) : entry.collection_id && entry.type !== 'collection_delete' ? (
              <Link to={`/collections/${entry.collection_id}`}>{describeActivity(entry)}</Link>
            ) : (
              <span>{describeActivity(entry)}</span>
            )}
            <div className="muted small">{timeAgo(entry.created_at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
