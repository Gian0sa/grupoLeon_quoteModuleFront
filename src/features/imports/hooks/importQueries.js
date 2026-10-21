import { useQuery } from "@tanstack/react-query";
import { fetchPurchaseOrdersImportacion, fetchBackOrderDemands } from "../services/importService";

export function usePurchaseOrdersImportacion() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchaseOrdersImportacion'],
    queryFn: fetchPurchaseOrdersImportacion,
    enabled: true,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });
  
  return {
    dataPurchaseOrdersImportacion: data,
    isLoadingPurchaseOrdersImportacion: isLoading,
    errorPurchaseOrdersImportacion: error,
    refetchPurchaseOrdersImportacion: refetch,
  };
}

export function useBackOrderDemands(filters = {}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['backOrderDemands', filters],
    queryFn: () => fetchBackOrderDemands(filters),
    enabled: true,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60 * 1000,
  });

  return {
    backOrdersData: data,
    isLoadingBackOrders: isLoading,
    isFetchingBackOrders: isFetching,
    errorBackOrders: error,
    refetchBackOrders: refetch,
  };
}

