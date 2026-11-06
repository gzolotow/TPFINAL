import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getFieldErrors } from '../services/api';
import FormField from '../components/FormField';
import AuthLayout from '../components/AuthLayout';

const EMPTY = { username: '', email: '', password: '', confirmPassword: '' };

// Mismas reglas que el backend, para avisar antes de enviar
function validate(form) {
  const errors = {};
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim())) {
    errors.username = 'Entre 3 y 30 caracteres: letras, números, punto o guion bajo';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Ingresá un correo válido';
  if (form.password.length < 8) errors.password = 'Mínimo 8 caracteres';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Tiene que tener letras y números';
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Las contraseñas no coinciden';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const newErrors = validate(form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error, 'No se pudo crear la cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Creá tu cuenta" subtitle="Armá tu biblioteca, puntuá y llevá la cuenta de lo que jugás.">
      {serverError && <div className="alert alert--error" role="alert">{serverError}</div>}
      <form onSubmit={handleSubmit} noValidate className="form">
        <FormField label="Nombre de usuario" error={errors.username} htmlFor="username">
          <input id="username" name="username" autoComplete="username" value={form.username} onChange={handleChange} />
        </FormField>
        <FormField label="Correo electrónico" error={errors.email} htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} />
        </FormField>
        <FormField label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres, con letras y números" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} />
        </FormField>
        <FormField label="Confirmar contraseña" error={errors.confirmPassword} htmlFor="confirmPassword">
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange} />
        </FormField>
        <button className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="auth__switch">
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </AuthLayout>
  );
}
