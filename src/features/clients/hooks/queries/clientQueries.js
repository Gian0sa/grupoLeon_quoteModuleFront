import { useQuery } from "@tanstack/react-query";
import { fetchClientByCode, fetchDeliveryPoints , fetchClientByName , fetchClientProductHistory} from "../../services/clientService";

export function useClientQueries(code) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["client", code],
    queryFn: () => fetchClientByCode(code),
    enabled: !!code,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
    error,
  };
}

export function useClientQueriesByName(name) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["client", name],
    queryFn: () => fetchClientByName(name),
    enabled: !!name,
  });

  return {
    data,
    isLoading,
    error,
  };
}

export function useClientPointsDelivery(id){
  const { data , isLoading , error } = useQuery({
    queryKey: ["deliveryPoints" , id],
    queryFn: () => fetchDeliveryPoints(id),
    enabled: !!id,
  });
  return{
    dataDeliveryPoints: data,
    isLoadingDeliveryPoints: isLoading,
    errorDeliveryPoints: error,
  }
}

export function useClientProductHistory(clientQuery, slpCode) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["clientHistory", clientQuery, slpCode], 
        queryFn: () => fetchClientProductHistory({ clientQuery, slpCode }),
        enabled: !!clientQuery && !!slpCode, 
        refetchOnWindowFocus: false,
        
        // Agregar opciones de retry y timeout
        retry: 1, // Solo reintentar 1 vez
        retryDelay: 1000, // Esperar 1 segundo antes de reintentar
        staleTime: 5 * 60 * 1000, // Los datos son válidos por 5 minutos
    });

    return {
        dataProductHistory: data,
        isLoadingProductHistory: isLoading,
        errorProductHistory: error,
        refetchProductHistory: refetch,
    };
}