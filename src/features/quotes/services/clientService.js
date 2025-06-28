import { useEffect } from "react";
import {
  useGetQuoteById,
  useGetTransports,
  useGetDeliveryForms,
  useGetPaymentType,
} from "../hooks/queries/quotesQueries";
import { adaptQuote } from "../adapters/quotesAdapter";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";
import { useQuoteStore } from "../stores/quoteStore";

export function useClientService(quoteId) {
  const {
    clear,
    setClient,
    setQuoteId,
    setSelectedPoint,
    setSelectedTransport,
    setSelectedPaymentType,
    setSelectedDeliveryForm,
    setComment,
    setDeliveryDate,
    setOpNum,
    setPaymentImg,
    setProducts,
  } = useQuoteStore();

  const { data, isLoading, error } = useGetQuoteById(quoteId);
  const cardcode = data?.clientDocument;

  console.log("la data que trae al reucperar el histiroiaol es : ",data)

  const { dataTransports, isLoadingTransports } = useGetTransports();
  const { dataDeliveryForms, isLoadingDeliveryForms } = useGetDeliveryForms();
  const { dataPaymentTypes, isLoadingPaymentTypes } = useGetPaymentType();

  const {
    dataDeliveryPoints,
    isLoadingDeliveryPoints,
    errorDeliveryPoints,
  } = useClientPointsDelivery(cardcode);

  useEffect(() => {
    if (!isLoading && data) {
      clear();

      const { client, products } = adaptQuote(data);

      // Setear ID de la cotización
      setQuoteId(data.id);


      setSelectedTransport({
        Name: data.transport,
        U_TQC_DIREC: data.transportDirection,
      });

      const paymentType =
        dataPaymentTypes?.find(
          (type) => String(type.GroupNum) === String(data.paymentType.GroupNum)
        ) || null;
        
      const deliveryForm =
        dataDeliveryForms?.find(
          (form) => form.TrnspName === data.deliveryForm
        ) || null;

      setSelectedPoint(data.deliveryPoint ?? null);
      setSelectedPaymentType(paymentType);
      setSelectedDeliveryForm(deliveryForm);

      setComment(data.comment ?? "");
      setDeliveryDate(data.deliveryDate ?? null);
      setOpNum(data.opNum ?? "");
      setPaymentImg(data.pathImg ?? null);
      setClient(client);
      setProducts(products);
    }
  }, [isLoading, data]);

  const isGlobalLoading =
    isLoading ||
    isLoadingTransports ||
    isLoadingDeliveryForms ||
    isLoadingDeliveryPoints ||
    isLoadingPaymentTypes;

  const hasError = error || errorDeliveryPoints;

  return {
    isLoading: isGlobalLoading,
    error: hasError,
    dataTransports,
    dataDeliveryPoints,
    dataDeliveryForms,
    dataPaymentTypes,
  };
}
