import { useState } from 'react';

// Puntuación de 1 a 5 estrellas. Si es de solo lectura, muestra las estrellas.
// Al tocar la estrella que ya está marcada, se quita la puntuación (onChange(null)).
export default function StarRating({ value, onChange, readOnly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;

  return (
    <div
      className={`stars stars--${size} ${readOnly ? 'stars--readonly' : ''}`}
      onMouseLeave={() => setHover(0)}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={value ? `${value} de 5 estrellas` : 'Sin puntuar'}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        readOnly ? (
          <span key={star} className={star <= shown ? 'is-on' : ''}>★</span>
        ) : (
          <button
            key={star}
            type="button"
            className={star <= shown ? 'is-on' : ''}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star === value ? null : star)}
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
            aria-checked={star === value}
            role="radio"
          >
            ★
          </button>
        )
      )}
    </div>
  );
}
