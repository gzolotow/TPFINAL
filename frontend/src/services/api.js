import axios from 'axios';

// Cliente de Axios para NUESTRO backend.
// withCredentials: el navegador manda la cookie httpOnly con el JWT en cada request.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
});

// Si el backend responde 401 en una ruta privada, el token venció o no es válido:
// avisamos a la app con un evento para que AuthContext cierre la sesión.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const isAuthCall = url.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthCall) {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: error.response.data?.error }));
    }
    return Promise.reject(error);
  }
);

// Convierte cualquier error de Axios en un mensaje para mostrar
export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado') {
  if (error?.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder';
  if (!error?.response) return 'No se pudo conectar con el servidor. Revisá tu conexión.';
  return error.response.data?.error || fallback;
}

// Errores por campo que manda el backend en { details: { campo: mensaje } }
export function getFieldErrors(error) {
  return error?.response?.data?.details ?? {};
}

export default api;
