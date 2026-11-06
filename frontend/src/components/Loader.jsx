export default function Loader({ label = 'Cargando...', fullScreen = false }) {
  return (
    <div className={`loader ${fullScreen ? 'loader--full' : ''}`} role="status">
      <span className="loader__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
