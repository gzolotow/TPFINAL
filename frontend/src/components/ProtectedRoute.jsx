import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

// Si no hay sesión, manda al login y recuerda a dónde quería ir el usuario
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <Loader fullScreen label="Comprobando sesión..." />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
