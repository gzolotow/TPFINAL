import Home from './pages/Home';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import GameDetail from './pages/GameDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Explore from './pages/Explore';
import Library from './pages/Library';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas: si ya hay sesión, redirigen al Home */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
      </Route>

      {/* Rutas privadas: requieren sesión */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Provisoria: Canievsky la reemplaza por <Home /> */}
         <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
                    <Route path="/games/:slug" element={<GameDetail />} />
          <Route path="/library" element={<Library />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
    </Routes>
  );
}