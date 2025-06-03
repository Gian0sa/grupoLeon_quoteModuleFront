import { useEffect } from "react";
import { useGetQuoteById, useGetTransports } from "../hooks/queries/quotesQueries";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";
import { adaptQuote } from "../adapters/quotesAdapter";
import { useQuoteStore } from "../stores/quoteStore";

export function useClientService(quoteId) {
  const {
    clear,
    setClient,
    setSelectedPoint,
    setSelectedTransport,
    setPaymentImg,
    setPaymentMethod,
    setProducts,
  } = useQuoteStore();

  const { data, isLoading, error } = useGetQuoteById(quoteId);
  const cardcode = data?.clientDocument;
  
  const { dataTransports, isLoadingTransports } = useGetTransports();
  const {
    dataDeliveryPoints,
    isLoadingDeliveryPoints,
    errorDeliveryPoints,
  } = useClientPointsDelivery(cardcode);

  useEffect(() => {
    if (!isLoading && data) {
      clear();

      const { client, products } = adaptQuote(data);

      const transport = {
        Name: data.transport,
        U_TQC_DIREC: data.transportDirection,
      };

      setSelectedTransport(transport);
      setPaymentMethod(data.paymentType);
      setSelectedPoint(data.deliveryPoint);
      setPaymentImg(data.pathImg);
      setClient(client);
      
      setProducts(products);
    }
  }, [isLoading, data]);

  const isGlobalLoading = isLoading || isLoadingTransports || isLoadingDeliveryPoints;
  const hasError = error || errorDeliveryPoints;

  return {
    isLoading: isGlobalLoading,
    error: hasError,
    dataTransports,
    dataDeliveryPoints,
  };
}
