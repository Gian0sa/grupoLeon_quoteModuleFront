// hooks/useReportQueries.js
import { useQuery } from "@tanstack/react-query";
import {
  getReportsBySalesperson,
  getDeliveryNoteByCode,
  getOrderByCode,
  getInvoiceByCode,
  getPdfByCode,
} from "../../services/reportService";

export const useGetSalespersonReports = (
  id,
  pagina = 1,
  porPagina = 10,
  estadoOrdenFiltro = null,
  startDate = null,
  endDate = null
) => {
  return useQuery({
    queryKey: [
      "salespersonReports",
      id,
      pagina,
      porPagina,
      estadoOrdenFiltro,
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
    enabled: !!code && enabled,
  });
};

export const useGetDeliveryNoteByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["deliveryNoteByCode", code],
    queryFn: () => getDeliveryNoteByCode(code),
    enabled: !!code && enabled,
  });
};

export const useGetInvoiceByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["invoiceByCode", code],
    queryFn: () => getInvoiceByCode(code),
    enabled: !!code && enabled,
  });
};

export const useGetPdfByCode = (code, enabled = true) => {
  return useQuery({
    queryKey: ["pdfByCode", code],
    queryFn: () => getPdfByCode(code),
    enabled: !!code && enabled,
  });
};