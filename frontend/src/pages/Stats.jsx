import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import { getStats } from '../services/userService';
import { getErrorMessage } from '../services/api';
import { MONTHS, STATUSES } from '../utils/constants';
import BarChart from '../components/BarChart';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

const CURRENT_YEAR = new Date().getFullYear();

export default function Stats() {
  const { items } = useLibrary();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Se vuelve a pedir cuando cambia el año o cuando cambia algo en la biblioteca:
  // los números siempre salen de la base de datos en el momento.
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    getStats(year)
      .then((data) => !ignore && setStats(data))
      .catch((err) => !ignore && setError(getErrorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [year, items, reloadKey]);

  if (loading && !stats) return <Loader label="Calculando estadísticas..." />;
  if (error && !stats) return <ErrorMessage message={error} onRetry={() => setReloadKey((key) => key + 1)} />;
  if (!stats) return null;

  const { summary, challenge } = stats;

  if (summary.total_games === 0) {
    return (
      <EmptyState title="Todavía no hay estadísticas" icon="📊">
        Agregá juegos a tu biblioteca y volvé por acá. <Link to="/explore">Explorar</Link>
      </EmptyState>
    );
  }

  const topGenre = stats.top_genres[0];
  const topPlatform = stats.top_platforms[0];
  const bestGame = stats.top_rated[0];
  const mostPlayed = stats.most_played[0];
  const bestMonthIndex = stats.completed_by_month.reduce(
    (best, month, index, all) => (month.count > all[best].count ? index : best),
    0
  );
  const maxMonth = Math.max(...stats.completed_by_month.map((month) => month.count), 1);

  return (
    <div className="stack-lg">
      <div className="page-head row-between">
        <div>
          <h1>Estadísticas</h1>
          <p className="muted">Calculadas en el momento con tu biblioteca.</p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año">
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      {/* Resumen estilo "Wrapped" */}
      <section className="wrapped">
        <p className="eyebrow">Tu año gamer {year}</p>
        <h2>
          Terminaste <span className="hl">{challenge.completed}</span> {challenge.completed === 1 ? 'juego' : 'juegos'} este año
          {topGenre && <> y tu género es <span className="hl">{topGenre.genre}</span></>}.
        </h2>
        <div className="wrapped__grid">
          {topPlatform && (
            <div><span className="muted small">Plataforma principal</span><strong>{topPlatform.platform}</strong><span className="small">{topPlatform.hours} h jugadas</span></div>
          )}
          {bestGame && (
            <div><span className="muted small">Tu mejor puntuado</span><strong>{bestGame.name}</strong><span className="small">{'★'.repeat(bestGame.rating)}</span></div>
          )}
          {mostPlayed && (
            <div><span className="muted small">Al que más horas le diste</span><strong>{mostPlayed.name}</strong><span className="small">{mostPlayed.hours_played} h</span></div>
          )}
          {challenge.completed > 0 && (
            <div><span className="muted small">Tu mes más productivo</span><strong>{MONTHS[bestMonthIndex]}</strong><span className="small">{stats.completed_by_month[bestMonthIndex].count} terminados</span></div>
          )}
        </div>
      </section>

      {/* Indicadores principales */}
      <section className="kpi-grid">
        <Kpi label="Juegos en biblioteca" value={summary.total_games} />
        <Kpi label="Terminados" value={summary.completed} sub={`${summary.completion_rate}% de la biblioteca`} />
        <Kpi label="Tasa de finalización" value={`${summary.finish_rate}%`} sub="de los que empezaste" />
        <Kpi label="Puntuación promedio" value={summary.average_rating ? `${summary.average_rating} ★` : '—'} sub={`${summary.rated} puntuados`} />
        <Kpi label="Horas jugadas" value={summary.total_hours} sub={summary.avg_hours_per_completed ? `${summary.avg_hours_per_completed} h por juego terminado` : ''} />
        <Kpi label="Favoritos · Reseñas" value={`${summary.favorites} · ${summary.reviews}`} sub={`${summary.collections} colecciones`} />
      </section>

      <div className="two-cols">
        <section className="card">
          <h3>Desafío {challenge.year}</h3>
          <div className="challenge">
            <div className="ring" style={{ '--pct': challenge.percent }}>
              <span>{challenge.percent}%</span>
            </div>
            <div>
              <strong className="big">{challenge.completed} / {challenge.goal}</strong>
              <p className="muted small">
                {challenge.completed >= challenge.goal
                  ? '¡Cumpliste tu objetivo! 🎉'
                  : `Te faltan ${challenge.goal - challenge.completed} para tu objetivo.`}
              </p>
              <Link to="/profile" className="small">Cambiar objetivo</Link>
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Biblioteca por estado</h3>
          <BarChart data={STATUSES.map((status) => ({ label: status.label, value: summary[status.value], color: status.color }))} />
        </section>
      </div>

      <section className="card">
        <h3>Juegos terminados por mes ({year})</h3>
        <div className="columns-chart">
          {stats.completed_by_month.map((month, index) => (
            <div key={month.month} className="columns-chart__col" title={`${month.count} terminados`}>
              <span className="columns-chart__value">{month.count || ''}</span>
              <span className="columns-chart__bar" style={{ height: `${(month.count / maxMonth) * 100}%` }} />
              <span className="columns-chart__label">{MONTHS[index]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="two-cols">
        <section className="card">
          <h3>Géneros favoritos</h3>
          <BarChart data={stats.top_genres.map((genre) => ({ label: genre.genre, value: genre.count }))} />
        </section>
        <section className="card">
          <h3>Plataformas más usadas (horas)</h3>
          <BarChart
            data={stats.top_platforms.map((platform) => ({ label: platform.platform, value: platform.hours, color: 'var(--accent)' }))}
            unit=" h"
            emptyText="Elegí en qué plataforma jugás cada juego desde su detalle."
          />
        </section>
      </div>

      <div className="two-cols">
        <section className="card">
          <h3>Distribución de puntuaciones</h3>
          <BarChart
            data={[...stats.rating_distribution].reverse().map((row) => ({ label: '★'.repeat(row.stars), value: row.count, color: 'var(--warning)' }))}
          />
        </section>
        <section className="card">
          <h3>Décadas de lanzamiento</h3>
          <BarChart data={stats.decades.map((row) => ({ label: `${row.decade}s`, value: row.count, color: 'var(--status-want)' }))} />
        </section>
      </div>

      <div className="two-cols">
        <section className="card">
          <h3>Top 5 mejor puntuados</h3>
          <RankList games={stats.top_rated} render={(game) => '★'.repeat(game.rating)} />
        </section>
        <section className="card">
          <h3>Top 5 más jugados</h3>
          <RankList games={stats.most_played} render={(game) => `${game.hours_played} h`} />
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="kpi card">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="small muted">{sub}</span>}
    </div>
  );
}

function RankList({ games, render }) {
  if (!games.length) return <p className="muted small">Sin datos todavía</p>;
  return (
    <ol className="rank-list">
      {games.map((game, index) => (
        <li key={game.id}>
          <span className="rank-list__pos">{index + 1}</span>
          {game.cover_url ? <img src={game.cover_url} alt="" /> : <span className="rank-list__ph">🎮</span>}
          <Link to={`/games/${game.slug}`}>{game.name}</Link>
          <span className="rank-list__value">{render(game)}</span>
        </li>
      ))}
    </ol>
  );
}
