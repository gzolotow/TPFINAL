import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return (
    <EmptyState title="Página no encontrada" icon="👾">
      <Link to="/" className="btn btn--primary">Volver al inicio</Link>
    </EmptyState>
  );
}
