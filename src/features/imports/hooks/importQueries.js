import { useQuery } from "@tanstack/react-query";
import { fetchPurchaseOrdersImportacion } from "../services/importService";

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

  console.log(data);
  
  return {
    dataPurchaseOrdersImportacion: data,
    isLoadingPurchaseOrdersImportacion: isLoading,
    errorPurchaseOrdersImportacion: error,
    refetchPurchaseOrdersImportacion: refetch,
  };
}
