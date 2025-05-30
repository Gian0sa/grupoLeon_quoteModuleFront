import { useEffect } from "react";
import { useGetQuoteDraftById, useGetTransports } from "../hooks/queries/quotesQueries";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";
import { adaptQuoteDraft } from "../adapters/quotesAdapter";
import { useQuoteStore } from "../stores/quoteStore";

export function useClientService(draftId) {
  console.log(draftId);
  const { setClient, addProduct , setSelectedPoint , setSelectedTransport , setPaymentImg , setPaymentMethod } = useQuoteStore();

  const { data, isLoading, error } = useGetQuoteDraftById(draftId);
  const cardcode = data?.clientDocument;
  const { dataTransports, isLoadingTransports } = useGetTransports();
  const {
    dataDeliveryPoints,
    isLoadingDeliveryPoints,
    errorDeliveryPoints, 
  } = useClientPointsDelivery(cardcode);

  useEffect(() => {
    if (!isLoading && data) {
      const { client, products } = adaptQuoteDraft(data);
      
      const transport = {
        Name: data.transport,
        U_TQC_DIREC: data.transportDirection,
      };

      const deliveryPoint = data.deliveryPoint;
      const paymentMethod = data.paymentType;
      const pathImg = data.pathImg;

      setSelectedTransport(transport);
      setPaymentMethod(paymentMethod);
      setSelectedPoint(deliveryPoint);
      setPaymentImg(pathImg);
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
