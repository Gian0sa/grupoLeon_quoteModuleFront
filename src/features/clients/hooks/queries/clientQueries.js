import { useQuery } from "@tanstack/react-query";
import { fetchClientByCode, fetchDeliveryPoints , fetchClientByName} from "../../services/clientService";

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