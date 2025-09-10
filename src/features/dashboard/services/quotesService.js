import { axiosInstance } from "../../../lib/axios";

export const getQuotesAdminSellers = async ({ slpCode, month }) => {
  try {
    const url = `/reportModule/AdminQuotesReports/${slpCode}/${month}`;
    const response = await axiosInstance.get(url);
    return response.data;
    } catch (error) {
    console.error("Error al obtener cuotas del vendedor:", error);
    return null;
    }
};

export const getQuotesSellers = async ({ slpCode, month }) => {
    try {
        const response = await axiosInstance.get(`/reportModule/quotesSellers/${slpCode}/${month}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener cuotas del vendedor:", error);
        return null;
    }       
};