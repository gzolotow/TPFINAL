import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/explore', label: 'Explorar' },
  { to: '/library', label: 'Biblioteca' },
  { to: '/collections', label: 'Colecciones' },
  { to: '/stats', label: 'Estadísticas' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar__inner container">
          <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand__logo" aria-hidden="true">▶</span>
            <span>My<strong>Collection</strong></span>
          </NavLink>

          <button
            className="navbar__toggle"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>

          <nav className={`navbar__links ${menuOpen ? 'is-open' : ''}`}>
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            <div className="navbar__user">
              <NavLink to="/profile" className="navbar__profile" onClick={() => setMenuOpen(false)}>
                <Avatar user={user} size={32} />
                <span>{user?.display_name || user?.username}</span>
              </NavLink>
              <button className="btn btn--ghost btn--sm" onClick={handleLogout}>Salir</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container page">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">My Collection · TP Final EFSI &amp; DAI 2026 · Datos de juegos: Steam</div>
      </footer>
    </div>
  );
}
