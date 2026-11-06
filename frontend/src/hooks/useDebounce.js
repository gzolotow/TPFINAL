import { useEffect, useState } from 'react';

// Devuelve el valor recién después de que deja de cambiar por `delay` ms.
// Lo usamos para no llamar a la API en cada tecla del buscador.
export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
