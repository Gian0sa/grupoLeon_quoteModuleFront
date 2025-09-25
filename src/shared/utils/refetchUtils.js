import { useQueryClient } from "@tanstack/react-query";

// Hook mejorado para refrescar queries
export function useRefetchQueries() {
  const queryClient = useQueryClient();

  // Refrescar queries específicas por keys
  const refetch = async (keys = []) => {
    const promises = keys.map((key) =>
      queryClient.refetchQueries({ 
        queryKey: key, 
        exact: false,
        type: 'active' // Solo refetch queries activas
      })
    );
    
    await Promise.all(promises);
  };

  // Invalidar y refrescar (más agresivo)
  const invalidateAndRefetch = async (keys = []) => {
    const promises = keys.map(async (key) => {
      await queryClient.invalidateQueries({ queryKey: key, exact: false });
      return queryClient.refetchQueries({ queryKey: key, exact: false, type: 'active' });
    });
    
    await Promise.all(promises);
  };

  // Refrescar todas las queries activas (usar con cuidado)
  const refetchAll = async () => {
    await queryClient.refetchQueries({ type: 'active' });
  };

  // Solo invalidar sin refetch inmediato
  const invalidate = async (keys = []) => {
    const promises = keys.map((key) =>
      queryClient.invalidateQueries({ queryKey: key, exact: false })
    );
    
    await Promise.all(promises);
  };

  return { 
    refetch, 
    invalidateAndRefetch, 
    refetchAll, 
    invalidate 
  };
}