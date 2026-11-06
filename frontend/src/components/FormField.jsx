// Campo de formulario con label y mensaje de error
export default function FormField({ label, error, hint, children, htmlFor }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}
