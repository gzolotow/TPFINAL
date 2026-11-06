import { useState } from 'react';

// Muestra la imagen de perfil o, si no hay (o falla), la inicial del usuario
export default function Avatar({ user, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const name = user?.display_name || user?.username || '?';
  const style = { width: size, height: size, fontSize: size * 0.42 };

  if (user?.avatar_url && !failed) {
    return <img className="avatar" src={user.avatar_url} alt={name} style={style} onError={() => setFailed(true)} />;
  }
  return (
    <span className="avatar avatar--initial" style={style} aria-label={name}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
