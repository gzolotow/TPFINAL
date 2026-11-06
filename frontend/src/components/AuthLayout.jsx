// Diseño compartido de Login y Registro: panel de marca a la izquierda y formulario a la derecha
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="auth__hero">
        <div className="brand brand--lg">
          <span className="brand__logo" aria-hidden="true">▶</span>
          <span>My<strong>Collection</strong></span>
        </div>
        <h2>Todos tus juegos,<br />en un solo lugar.</h2>
        <ul className="auth__features">
          <li><span>◆</span> Buscá en todo el catálogo de Steam</li>
          <li><span>◆</span> Marcá qué jugás, terminaste o abandonaste</li>
          <li><span>◆</span> Puntuá, reseñá y armá colecciones</li>
          <li><span>◆</span> Mirá tu año gamer en estadísticas</li>
        </ul>
      </aside>
      <section className="auth__panel">
        <div className="auth__card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
      </section>
    </div>
  );
}
