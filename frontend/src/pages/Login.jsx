import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getFieldErrors } from '../services/api';
import FormField from '../components/FormField';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const { login, sessionMessage, clearSessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.identifier.trim()) newErrors.identifier = 'Ingresá tu correo o usuario';
    if (!form.password) newErrors.password = 'Ingresá tu contraseña';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    clearSessionMessage();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(form);
      // Volver a la página que quería ver antes de que le pidiéramos login
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error, 'No se pudo iniciar sesión'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Iniciá sesión" subtitle="Tu biblioteca de juegos te está esperando.">
      {sessionMessage && <div className="alert alert--warning">{sessionMessage}</div>}
      {serverError && <div className="alert alert--error" role="alert">{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate className="form">
        <FormField label="Correo o usuario" error={errors.identifier} htmlFor="identifier">
          <input id="identifier" name="identifier" autoComplete="username" value={form.identifier} onChange={handleChange} />
        </FormField>
        <FormField label="Contraseña" error={errors.password} htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} />
        </FormField>
        <button className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="auth__switch">
        ¿No tenés cuenta? <Link to="/register">Registrate</Link>
      </p>
    </AuthLayout>
  );
}
