import { useQuery } from "@tanstack/react-query";
import { fetchClientByCode, fetchDeliveryPoints } from "../../services/clientService";

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

export function useClientQueriesById(id) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClientById(id),
    enabled: !!id,
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