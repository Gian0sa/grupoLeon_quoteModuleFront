import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchClientByCode, fetchDeliveryPoints , fetchClientByName , fetchClientProductHistory , fetchClientProductHistoryAdmin , fetchPriceListByItemCodes , fetchPurchaseOrdersImportacion , fetchPurchaseOrderDetail, fetchNewClients, updateNewClient} from "../../services/clientService";

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
    enabled: !!clientQuery,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    dataProductHistory: data,
    isLoadingProductHistory: isLoading,
    errorProductHistory: error,
    refetchProductHistory: refetch,
  };
}

export function useClientProductHistoryAdmin(clientQuery) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["clientHistory", clientQuery],
    queryFn: () => fetchClientProductHistoryAdmin({ clientQuery }),
    enabled: !!clientQuery,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    dataProductHistory: data,
    isLoadingProductHistory: isLoading,
    errorProductHistory: error,
    refetchProductHistory: refetch,
  };
}

export function usePriceListByItemCodes(itemCodes) {
  const itemCodesKey = Array.isArray(itemCodes)
    ? itemCodes.join(',')
    : itemCodes;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['priceListByItems', itemCodesKey],
    queryFn: () =>
      fetchPriceListByItemCodes({ itemCodes }),
    enabled: !!itemCodesKey && itemCodesKey.length > 0,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    dataPriceList: data,
    isLoadingPriceList: isLoading,
    errorPriceList: error,
    refetchPriceList: refetch,
  };
}

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

export function usePurchaseOrderDetail(docEntry) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['purchaseOrderDetail', docEntry],
    queryFn: () => fetchPurchaseOrderDetail(docEntry),
    enabled: !!docEntry,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    dataPurchaseOrderDetail: data,
    isLoadingPurchaseOrderDetail: isLoading,
    errorPurchaseOrderDetail: error,
    refetchPurchaseOrderDetail: refetch,
  };
}

export function useNewClientsQuery(vendorCode, username) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["newClients", vendorCode, username],
    queryFn: () => fetchNewClients({ vendorCode, username }),
    refetchOnWindowFocus: false,
  });

  return {
    dataNewClients: data || [],
    isLoadingNewClients: isLoading,
    errorNewClients: error,
    refetchNewClients: refetch,
  };
}

export function useUpdateNewClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNewClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newClients"] });
    },
  });
}
