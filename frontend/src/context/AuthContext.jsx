import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

// Contexto de autenticación: guarda el usuario activo y expone login, registro y logout.
// El JWT NO se guarda acá ni en localStorage: vive en una cookie httpOnly que maneja el navegador.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'checking' mientras preguntamos al backend si hay sesión al abrir la app
  const [status, setStatus] = useState('checking');
  const [sessionMessage, setSessionMessage] = useState('');

  // Al arrancar: ¿hay una sesión válida? (cookie con token no vencido)
  useEffect(() => {
    authService
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus(currentUser ? 'authenticated' : 'guest');
      })
      .catch(() => {
        // Si el backend no responde, tratamos al usuario como invitado
        setUser(null);
        setStatus('guest');
      });
  }, []);

  // Si alguna llamada devuelve 401 (token vencido), cerramos la sesión local
  useEffect(() => {
    const handleExpired = (event) => {
      setUser(null);
      setStatus('guest');
      setSessionMessage(event.detail || 'Tu sesión expiró. Volvé a iniciar sesión.');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedUser = await authService.login(credentials);
    setUser(loggedUser);
    setStatus('authenticated');
    setSessionMessage('');
    return loggedUser;
  }, []);

  const register = useCallback(async (data) => {
    const newUser = await authService.register(data);
    setUser(newUser);
    setStatus('authenticated');
    setSessionMessage('');
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Aunque falle la red, borramos la sesión local
      setUser(null);
      setStatus('guest');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      sessionMessage,
      clearSessionMessage: () => setSessionMessage(''),
      login,
      register,
      logout,
      setUser, // para actualizar los datos después de editar el perfil
    }),
    [user, status, sessionMessage, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
