import { useQueryClient } from "@tanstack/react-query";

// Hook mejorado para refrescar queries
export function useRefetchQueries() {
  const queryClient = useQueryClient();

  // Refrescar queries específicas por keys (sin filtro de tipo)
  const refetch = async (keys = []) => {
    const promises = keys.map((key) =>
      queryClient.refetchQueries({ 
        queryKey: key, 
        exact: false,
      })
    );
    await Promise.all(promises);
  };

  // Invalidar + esperar tick + refetch forzado (garantiza recarga visual)
  const invalidateAndRefetch = async (keys = []) => {
    // 1. Invalidar todas las queries especificadas
    await Promise.all(
      keys.map((key) =>
        queryClient.invalidateQueries({ queryKey: key, exact: false })
      )
    );

    // 2. Pequeño delay para que React procese el estado stale
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 3. Forzar refetch sin filtro de tipo (incluye inactivas también)
    await Promise.all(
      keys.map((key) =>
        queryClient.refetchQueries({ queryKey: key, exact: false })
      )
    );
  };

  // Refrescar TODAS las queries activas (botón global de recarga)
  const refetchAll = async () => {
    await queryClient.invalidateQueries();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await queryClient.refetchQueries({ type: 'active' });
  };

  // Solo invalidar sin refetch inmediato
  const invalidate = async (keys = []) => {
    await Promise.all(
      keys.map((key) =>
        queryClient.invalidateQueries({ queryKey: key, exact: false })
      )
    );
  };

  return { 
    refetch, 
    invalidateAndRefetch, 
    refetchAll, 
    invalidate 
  };
}