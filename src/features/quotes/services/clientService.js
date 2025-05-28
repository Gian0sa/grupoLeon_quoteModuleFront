import { useEffect } from "react";
import { useGetQuoteDraftById, useGetTransports } from "../hooks/queries/quotesQueries";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";
import { adaptQuoteDraft } from "../adapters/quotesAdapter";
import { useQuoteStore } from "../stores/quoteStore";

export function useClientService(draftId) {
  const { setClient, addProduct } = useQuoteStore();

  const { data, isLoading, error } = useGetQuoteDraftById(draftId);
  const cardcode = data?.clientDocument;
console.log("mi cardcode es : ",cardcode);
  const { dataTransports, isLoadingTransports } = useGetTransports();
  const {
    data: dataDeliveryPoints,
    isLoading: isLoadingDeliveryPoints,
    error: errorDeliveryPoints, 
  } = useClientPointsDelivery(cardcode);

  useEffect(() => {
    if (!isLoading && data) {
      const { client, products } = adaptQuoteDraft(data);
      setClient(client);
      products.forEach(addProduct);
    }
  }, [isLoading, data, setClient, addProduct]);

  const isGlobalLoading = isLoading || isLoadingTransports || isLoadingDeliveryPoints;
  const hasError = error || errorDeliveryPoints;

  return {
    isLoading: isGlobalLoading,
    error: hasError,
    dataTransports,
    dataDeliveryPoints,
  };
}
