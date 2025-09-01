// hooks/useReportQueries.js
import { useQuery } from "@tanstack/react-query";
import {
  getReportsBySalesperson,
  getDeliveryNoteByCode,
  getOrderByCode,
  getInvoiceByCode,
  getPdfByCode,
  getAccountsReceivable,
  getcompareOrderAndDelivery,
  getOrdersReports
} from "../../services/reportService";

export const useGetSalespersonReports = (
  id,
  pagina = 1,
  porPagina = 10,
  estadoOrdenFiltro = [],
  startDate = null,
  endDate = null
) => {
  return useQuery({
    queryKey: [
      "salespersonReports",
      id,
      pagina,
      porPagina,
      estadoOrdenFiltro?.join(","),
      startDate,
      endDate,
    ],
    queryFn: () =>
      getReportsBySalesperson(
        id,
        pagina,
        porPagina,
        estadoOrdenFiltro,
        startDate,
        endDate
      ),
    keepPreviousData: true,
  });
};

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

export const useGetOrdersReports = ({
  salesPersonCode,
  page = 0,
  pageSize = 10,
  startDate = null,
  endDate = null,
  enabled = true
}) => {
  return useQuery({
    queryKey: [
      "ordersReports",
      salesPersonCode,
      page,
      pageSize,
      startDate,
      endDate
    ],
    queryFn: () =>
      getOrdersReports({ salesPersonCode, page, pageSize, startDate, endDate })
  });
};