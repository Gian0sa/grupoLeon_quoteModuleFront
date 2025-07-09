import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getReportsBySalesperson = async (id, pagina = 1, porPagina = 10, estadoOrdenFiltro = null) => {
  try {
    const response = await axiosInstance.get(`/reportModule/reports/${id}`, {
      params: {
        pagina,
        porPagina,
        ...(estadoOrdenFiltro ? { estadoOrdenFiltro } : {}),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error al obtener los reportes:", error);
    return null;
  }
};

export const getOrderByCode = async (code) => {
    try {
        const response = await axiosInstance.get(`/reportModule/order/${code}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la orden por código:", error);
        return null;
    }
}

export const getDeliveryNoteByCode = async (code) => {
    try {
        const response = await axiosInstance.get(`/reportModule/deliveryNote/${code}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la nota de entrega por código:", error);
        return null;
    }
}

export const getInvoiceByCode = async (code) => {
    try {
        const response = await axiosInstance.get(`/reportModule/invoice/${code}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la factura por código:", error);
        return null;
    }
}

export const getPdfByCode = async (code) => {
    try {
        const response = await axiosInstance.get(`/reportModule/pdf/${code}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener el PDF por código:", error);
        return null;
    }
}