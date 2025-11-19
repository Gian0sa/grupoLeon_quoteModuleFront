// hooks/useReportQueries.js
import { useQuery } from "@tanstack/react-query";
import {
  getDeliveryNoteByCode,
  getOrderByCode,
  getInvoiceByCode,
  getPdfByCode,
  getAccountsReceivable,
  getcompareOrderAndDelivery,
  getOrderswithStatusReports,
  getInvoiceDeliveryNoteperOrder,
  getCancelledOrderData
} from "../../services/reportService";

export const useGetOrderByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["orderByCode", code],
    queryFn: () => getOrderByCode(code),
    enabled: Boolean(code) && Boolean(enabled),
  });
};

export const useGetDeliveryNoteByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["deliveryNoteByCode", code],
    queryFn: () => getDeliveryNoteByCode(code),
    enabled: Boolean(code) && Boolean(enabled),
  });
};

export const useGetInvoiceByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["invoiceByCode", code],
    queryFn: () => getInvoiceByCode(code),
    enabled: Boolean(code) && Boolean(enabled),
  });
};

export const useGetPdfByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["pdfByCode", code],
    queryFn: () => getPdfByCode(code),
    enabled: Boolean(code) && Boolean(enabled),
  });
};

export const useGetAccountsReceivable = (params, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", params],
    queryFn: () => getAccountsReceivable(params),
    enabled: Boolean(params?.vendedor) && Boolean(enabled),
  });
};

export const useGetCompareOrderAndDeliveryNote = (orderCode, deliveryNoteCode, enabled = true) => {
  return useQuery({
    queryKey: ["compareOrderAndDeliveryNote", orderCode, deliveryNoteCode],
    queryFn: () => getcompareOrderAndDelivery(orderCode, deliveryNoteCode),
    enabled: Boolean(orderCode) && Boolean(enabled),
  });
}

export const useGetCancelledOrderData = (orderCode, enabled = true) => {
  return useQuery({
    queryKey: ["cancelledOrderData", orderCode],
    queryFn: () => getCancelledOrderData(orderCode),
    enabled: Boolean(orderCode) && Boolean(enabled),
  });
};

export const useGetOrderswithStatusReports = ({
  salesPersonCode,
  estadopedido = '',
  page = 0,
  pageSize = 5,
}) => {
  return useQuery({
    queryKey: [
      "orderswithStatusReports",
      salesPersonCode,
      estadopedido,
      page,
      pageSize,
    ],
    queryFn: () =>
      getOrderswithStatusReports({ salesPersonCode, estadopedido, page, pageSize })
  });
};

export const useGetInvoiceDeliveryNoteperOrder = ({ docEntry }) => {
  return useQuery({
    queryKey: ["invoiceDeliveryNoteperOrder", docEntry],
    queryFn: () => getInvoiceDeliveryNoteperOrder({ docEntry }),
    enabled: !!docEntry,
  });
};
