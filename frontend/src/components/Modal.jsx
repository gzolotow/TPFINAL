import { useEffect } from 'react';

export default function Modal({ title, onClose, children }) {
  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
