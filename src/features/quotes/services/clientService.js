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
    setContactPerson,
    setRefNumber,
    setSaleCondition,
    setDocumentType,
    setIsLetra,
    setCreditTerm,
    setWhsCode,
  } = useQuoteStore();

  const { data, isLoading, error } = useGetQuoteById(quoteId);
  const cardcode = data?.clientDocument;


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


      if (data.transport || data.selectedTransport) {
        if (typeof data.selectedTransport === "object" && data.selectedTransport !== null) {
          setSelectedTransport(data.selectedTransport);
        } else {
          setSelectedTransport({
            Name: data.transport || data.selectedTransport,
            U_TQC_DIREC: data.transportDirection || "",
          });
        }
      }

      let paymentType = null;
      if (data.paymentType || data.selectedPaymentType) {
        const pVal = data.selectedPaymentType || data.paymentType;
        const pGroup = typeof pVal === "object" ? (pVal?.GroupNum ?? pVal?.PymntGroup) : pVal;
        paymentType =
          dataPaymentTypes?.find(
            (type) => String(type.GroupNum) === String(pGroup) || type.PymntGroup === pGroup
          ) || (typeof pVal === "object" ? pVal : { GroupNum: pVal, PymntGroup: pVal });
      }

      let deliveryForm = null;
      if (data.deliveryForm || data.selectedDeliveryForm) {
        const dVal = data.selectedDeliveryForm || data.deliveryForm;
        const dName = typeof dVal === "object" ? (dVal?.TrnspName ?? dVal?.TrnspCode) : dVal;
        deliveryForm =
          dataDeliveryForms?.find(
            (form) => form.TrnspName === dName || String(form.TrnspCode) === String(dName)
          ) || (typeof dVal === "object" ? dVal : { TrnspCode: dVal, TrnspName: String(dVal) });
      }

      setSelectedPoint(data.selectedPoint ?? data.deliveryPoint ?? null);
      setSelectedPaymentType(paymentType);
      setSelectedDeliveryForm(deliveryForm);

      const contactPersonVal = data.contactPerson || data.totals?.contactPerson || data.ContactPerson || "";
      const refNumberVal = data.refNumber || data.totals?.refNumber || data.NumAtCard || data.numAtCard || "";
      const saleConditionVal = data.saleCondition || data.totals?.saleCondition || "CONTADO";
      const documentTypeVal = data.documentType || data.totals?.documentType || "FACTURA";
      const isLetraVal = Boolean(data.isLetra || data.totals?.isLetra);
      const creditTermVal = data.creditTerm || data.totals?.creditTerm || "ANTICIPADO";
      const whsCodeVal = data.whsCode || data.totals?.whsCode || "014";

      if (typeof setContactPerson === "function") setContactPerson(contactPersonVal);
      if (typeof setRefNumber === "function") setRefNumber(refNumberVal);
      if (typeof setSaleCondition === "function") setSaleCondition(saleConditionVal);
      if (typeof setDocumentType === "function") setDocumentType(documentTypeVal);
      if (typeof setIsLetra === "function") setIsLetra(isLetraVal);
      if (typeof setCreditTerm === "function") setCreditTerm(creditTermVal);
      if (typeof setWhsCode === "function") setWhsCode(whsCodeVal);

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
