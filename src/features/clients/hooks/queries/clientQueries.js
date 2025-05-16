import { useQuery } from "@tanstack/react-query";
import { fetchClientByCode } from "../../services/clientService";
import { adaptClientFromApi } from "../../adapters/clientAdapter";

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