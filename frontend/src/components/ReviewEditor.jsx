import { useEffect, useState } from 'react';
import * as reviewsService from '../services/reviewsService';
import { getErrorMessage } from '../services/api';
import { formatDate } from '../utils/format';

// Ver, escribir, editar y borrar la reseña del usuario para un juego
export default function ReviewEditor({ gameId, review, onSaved }) {
  const [editing, setEditing] = useState(!review);
  const [text, setText] = useState(review?.body ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(review?.body ?? '');
    setEditing(!review);
  }, [review]);

  const handleSave = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      setError('La reseña debe tener al menos 10 caracteres');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await reviewsService.saveReview(gameId, trimmed);
      onSaved(saved);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Borrar tu reseña?')) return;
    setSaving(true);
    try {
      await reviewsService.deleteReview(gameId);
      onSaved(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (review && !editing) {
    return (
      <div className="review card">
        <p className="prose">{review.body}</p>
        <div className="row-between">
          <span className="muted small">
            {review.updated_at !== review.created_at ? 'Editada el ' : 'Escrita el '}
            {formatDate(review.updated_at)}
          </span>
          <div className="row">
            <button className="btn btn--sm" onClick={() => setEditing(true)}>Editar</button>
            <button className="btn btn--sm btn--ghost btn--danger" onClick={handleDelete} disabled={saving}>Borrar</button>
          </div>
        </div>
        {error && <p className="field__error">{error}</p>}
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={handleSave}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={3000}
        placeholder="¿Qué te pareció? Historia, jugabilidad, lo mejor y lo peor..."
        aria-label="Tu reseña"
      />
      <div className="row-between">
        <span className="muted small">{text.trim().length} / 3000</span>
        <div className="row">
          {review && <button type="button" className="btn btn--sm btn--ghost" onClick={() => setEditing(false)}>Cancelar</button>}
          <button className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Guardando...' : 'Guardar reseña'}</button>
        </div>
      </div>
      {error && <p className="field__error">{error}</p>}
    </form>
  );
}
