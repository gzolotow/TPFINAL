import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { getActivity, getProfile, updateProfile } from '../services/userService';
import { getErrorMessage, getFieldErrors } from '../services/api';
import { GENRE_OPTIONS, PLATFORM_OPTIONS } from '../utils/constants';
import { formatDate } from '../utils/format';
import Avatar from '../components/Avatar';
import ActivityList from '../components/ActivityList';
import FormField from '../components/FormField';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import GameCard from '../components/GameCard';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { items } = useLibrary();
  const [counts, setCounts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([getProfile(), getActivity(15)])
      .then(([profile, recent]) => {
        setUser(profile.user);
        setCounts(profile.counts);
        setActivity(recent);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const favorites = items.filter((item) => item.is_favorite);

  if (loading && !counts) return <Loader />;

  return (
    <div className="stack-lg">
      {error && <ErrorMessage message={error} onRetry={load} />}

      <section className="profile-head card">
        <Avatar user={user} size={96} />
        <div className="profile-head__info">
          <h1>{user.display_name || user.username}</h1>
          <p className="muted">@{user.username} · Miembro desde {formatDate(user.created_at)}</p>
          <p className="prose">{user.bio || <span className="muted">Todavía no escribiste tu bio.</span>}</p>
          <div className="chips">
            {user.favorite_genres.map((genre) => <span key={genre} className="chip">{genre}</span>)}
            {user.favorite_platforms.map((platform) => <span key={platform} className="chip chip--alt">{platform}</span>)}
          </div>
        </div>
        <button className="btn" onClick={() => setEditing((value) => !value)}>{editing ? 'Cerrar' : 'Editar perfil'}</button>
      </section>

      {editing && (
        <ProfileForm
          user={user}
          onSaved={(updated) => {
            setUser(updated);
            setEditing(false);
            getActivity(15).then(setActivity).catch(() => {});
          }}
        />
      )}

      {counts && (
        <section className="stat-row">
          <div className="stat"><strong>{counts.library}</strong><span>Juegos</span></div>
          <div className="stat"><strong>{counts.completed}</strong><span>Terminados</span></div>
          <div className="stat"><strong>{counts.favorites}</strong><span>Favoritos</span></div>
          <div className="stat"><strong>{counts.reviews}</strong><span>Reseñas</span></div>
          <div className="stat"><strong>{counts.collections}</strong><span>Colecciones</span></div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Favoritos</h2>
          <Link to="/library?favorite=true">Ver en biblioteca</Link>
        </div>
        {favorites.length ? (
          <div className="carousel">
            {favorites.map((item) => <GameCard key={item.game_id} game={item.game} libraryItem={item} compact />)}
          </div>
        ) : (
          <p className="muted">Todavía no marcaste favoritos.</p>
        )}
      </section>

      <section className="card">
        <h2>Actividad</h2>
        <ActivityList activity={activity} />
      </section>
    </div>
  );
}

// Formulario de edición del perfil
function ProfileForm({ user, onSaved }) {
  const [form, setForm] = useState({
    display_name: user.display_name ?? '',
    bio: user.bio ?? '',
    avatar_url: user.avatar_url ?? '',
    favorite_genres: user.favorite_genres ?? [],
    favorite_platforms: user.favorite_platforms ?? [],
    yearly_goal: user.yearly_goal ?? 12,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newErrors = {};
    if (!form.display_name.trim()) newErrors.display_name = 'El nombre no puede quedar vacío';
    if (form.avatar_url && !/^https?:\/\/.+/.test(form.avatar_url)) newErrors.avatar_url = 'Tiene que ser una URL que empiece con http:// o https://';
    const goal = Number(form.yearly_goal);
    if (!Number.isInteger(goal) || goal < 1 || goal > 365) newErrors.yearly_goal = 'Entre 1 y 365';
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setSaving(true);
    setServerError('');
    try {
      const updated = await updateProfile({ ...form, avatar_url: form.avatar_url.trim() || null, yearly_goal: goal });
      onSaved(updated);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>Editar perfil</h2>
      {serverError && <div className="alert alert--error">{serverError}</div>}
      <div className="two-inputs">
        <FormField label="Nombre visible" error={errors.display_name} htmlFor="display_name">
          <input id="display_name" maxLength={60} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </FormField>
        <FormField label="Objetivo de juegos terminados por año" error={errors.yearly_goal} htmlFor="yearly_goal">
          <input id="yearly_goal" type="number" min="1" max="365" value={form.yearly_goal} onChange={(e) => setForm({ ...form, yearly_goal: e.target.value })} />
        </FormField>
      </div>
      <FormField label="URL del avatar" error={errors.avatar_url} hint="Pegá el link de una imagen (o dejalo vacío)" htmlFor="avatar_url">
        <input id="avatar_url" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
      </FormField>
      <FormField label="Bio" error={errors.bio} htmlFor="bio">
        <textarea id="bio" rows={3} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </FormField>
      <fieldset className="fieldset">
        <legend>Géneros preferidos</legend>
        <div className="chips">
          {GENRE_OPTIONS.map((genre) => (
            <button type="button" key={genre} className={`chip chip--toggle ${form.favorite_genres.includes(genre) ? 'is-active' : ''}`} onClick={() => toggle('favorite_genres', genre)}>
              {genre}
            </button>
          ))}
        </div>
        {errors.favorite_genres && <span className="field__error">{errors.favorite_genres}</span>}
      </fieldset>
      <fieldset className="fieldset">
        <legend>Plataformas</legend>
        <div className="chips">
          {PLATFORM_OPTIONS.map((platform) => (
            <button type="button" key={platform} className={`chip chip--toggle ${form.favorite_platforms.includes(platform) ? 'is-active' : ''}`} onClick={() => toggle('favorite_platforms', platform)}>
              {platform}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="row row--end">
        <button className="btn btn--primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}
