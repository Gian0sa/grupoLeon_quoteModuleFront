import { useEffect, useState } from "react";

/**
 * Devuelve `value` retrasado `delay` ms.
 *
 * Pensado para búsquedas contra SAP: la vista de lista de precios ejecuta una
 * escalera de búsquedas de respaldo, así que disparar una petición por tecla
 * multiplica las llamadas.
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
