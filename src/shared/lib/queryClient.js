import { QueryClient } from "@tanstack/react-query";

/**
 * Instancia central de TanStack Query Client optimizada para bajo consumo de RAM.
 * - staleTime: 3 minutos (mantiene datos frescos sin re-peticiones innecesarias)
 * - gcTime: 5 minutos (recolecta y libera de la memoria RAM pantallas que ya no se usan,
 *   evitando la saturación progresiva en teléfonos móviles)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      retry: false,
      retryOnMount: false,
      staleTime: 1000 * 60 * 3, // 3m
      gcTime: 1000 * 60 * 5,    // 5m (Garbage collection ágil para liberar RAM en móviles)
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: false,
      networkMode: "offlineFirst",
    },
  },
});

/**
 * Limpieza profunda de memoria RAM y cachés de sesión:
 * 1. Vacía toda la memoria de React Query en RAM (listas de productos, cotizaciones, reportes).
 * 2. Vacía sessionStorage por completo (estados temporales).
 * 3. Limpia cachés transitorias de datos en localStorage sin tocar colas de visitas offline.
 */
export const clearSessionCaches = () => {
  try {
    // 1. Vaciar toda la memoria RAM de React Query
    queryClient.clear();
  } catch (e) {
    console.warn("⚠️ Error vaciando queryClient:", e);
  }

  try {
    // 2. Limpiar sessionStorage de estados temporales
    sessionStorage.clear();
  } catch (e) {
    console.warn("⚠️ Error limpiando sessionStorage:", e);
  }

  try {
    // 3. Limpiar cachés transitorias en localStorage
    const volatileKeys = [
      "cached_sap_sellers",
      "grupoLeon_notifications",
      "checkin_selected_client",
      "lastRoute",
    ];
    volatileKeys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn("⚠️ Error limpiando claves transitorias de localStorage:", e);
  }
};
