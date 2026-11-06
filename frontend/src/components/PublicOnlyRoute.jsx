import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

// Login y registro: si ya hay sesión no tiene sentido verlos
export default function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <Loader fullScreen label="Comprobando sesión..." />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
