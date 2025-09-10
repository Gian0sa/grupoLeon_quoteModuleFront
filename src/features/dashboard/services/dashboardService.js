import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getTopProducts = async () => {
    const response = await axiosInstance.get('/quoteModule/dashboard/top-products');
    return response.data;
};

export const getPromotions = async () => {
    const response = await axiosInstance.get('/quoteModule/dashboard/promotions');
    return response.data;
};

export const getHistory = async () => {
    const response = await axiosInstance.get('/quoteModule/dashboard/history');
    return response.data;
};

export const getQuotesSellersAdmin = async ({ slpCode, month, page = 1, pageSize = 20 }) => {
  try {
    const skip = (page - 1) * pageSize;

    const url = `/reportModule/AdminQuotesSellers/${slpCode}/${month}`;

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
