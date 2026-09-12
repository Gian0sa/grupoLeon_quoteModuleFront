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

  // Invalidar y recargar una sola vez, incluyendo las consultas inactivas.
  const invalidateAndRefetch = async (keys = []) => {
    // 1. Invalidar todas las queries especificadas
    await Promise.all(
      keys.map((key) =>
        queryClient.invalidateQueries({ queryKey: key, exact: false, refetchType: "none" })
      )
    );

    // La invalidación anterior no dispara otra petición en paralelo.
    await Promise.all(
      keys.map((key) =>
        queryClient.refetchQueries({ queryKey: key, exact: false })
      )
    );
  };

  // Refrescar TODAS las queries activas (botón global de recarga)
  const refetchAll = async () => {
    await queryClient.invalidateQueries({ refetchType: "active" });
  };

  // Solo invalidar sin refetch inmediato
  const invalidate = async (keys = []) => {
    await Promise.all(
      keys.map((key) =>
        queryClient.invalidateQueries({ queryKey: key, exact: false, refetchType: "none" })
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
