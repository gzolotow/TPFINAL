import { useState } from 'react';
import FormField from './FormField';
import { getErrorMessage, getFieldErrors } from '../services/api';

// Formulario para crear o editar una colección
export default function CollectionForm({ initial = { name: '', description: '' }, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({ name: initial.name ?? '', description: initial.description ?? '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: 'Poné un nombre' });
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      await onSubmit({ name: form.name.trim(), description: form.description.trim() });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" noValidate>
      {serverError && <div className="alert alert--error">{serverError}</div>}
      <FormField label="Nombre" error={errors.name} htmlFor="collection-name">
        <input id="collection-name" value={form.name} maxLength={80} autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Descripción (opcional)" error={errors.description} htmlFor="collection-description">
        <textarea id="collection-description" rows={3} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>
      <div className="row row--end">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn--primary" disabled={saving}>{saving ? 'Guardando...' : submitLabel}</button>
      </div>
    </form>
  );
}
