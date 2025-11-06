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

export const getQuotesSellersAdmin = async ({ slpCode, yearFrom, monthFrom, monthTo, page = 1, pageSize = 20 }) => {
  try {
    const skip = (page - 1) * pageSize;

    const url = `/reportModule/AdminQuotesSellers/${slpCode}`;

    const response = await axiosInstance.get(url, {
      params: {
        yearFrom,
        monthFrom,
        monthTo,
        skip,
        pageSize,
      },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error al obtener cuotas del vendedor (Admin):", error);
    return null;
  }
};

export const getQuotesSellers = async ({ slpCode, yearFrom, monthFrom, monthTo, page = 1, pageSize = 20 }) => {
  try {
    const skip = (page - 1) * pageSize;


    const url = `/reportModule/quotesSellers/${slpCode}`;

    const response = await axiosInstance.get(url, {
      params: {
        yearFrom,
        monthFrom,
        monthTo,
        skip,
        pageSize,
      },
    });
console.log("Datos de cuotas del vendedor recibidos:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error al obtener cuotas del vendedor:", error);
    return null;
  }
};

export const getExchangeRate = async ({ currency, date }) => {
    try {
      console.log(`Obteniendo tipo de cambio para ${currency} en la fecha ${date}`);
        const response = await axiosInstance.get(`/reportModule/exchangeRate/${currency}/${date}`);
        console.log("Datos de tipo de cambio recibidos:", response.data);
        return response.data;
    } catch (error) { 
        console.error("Error al obtener el tipo de cambio:", error);
        return null;
    }
};

export const getDashboardMotives = async ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  try {
    console.log(`Obteniendo motivos del dashboard para vendedor ${slpCode}`);
    const response = await axiosInstance.get(`/reportModule/dashboardMotives`, {
      params: { yearFrom, monthFrom, monthTo, slpCode },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener los motivos del dashboard:', error);
    return null;
  }
};

export const getOrdersCancelated = async ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  try {
    console.log(`Obteniendo pedidos cancelados para vendedor ${slpCode}`);
    const response = await axiosInstance.get(`/reportModule/ordersCancelated`, {
      params: { yearFrom, monthFrom, monthTo, slpCode },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener los pedidos cancelados:', error);
    return null;
  }
};

export const getTopCanceledProducts = async ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  try {
    console.log(`Obteniendo productos más cancelados para vendedor ${slpCode}`);
    const response = await axiosInstance.get(`/reportModule/topCanceledProducts`, {
      params: { yearFrom, monthFrom, monthTo, slpCode },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener los productos cancelados:', error);
    return null;
  }
};

export const getTopSelledProducts = async ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  try {
    console.log(`Obteniendo productos más vendidos para vendedor ${slpCode}`);
    const response = await axiosInstance.get(`/reportModule/topSelledProducts`, {
      params: { yearFrom, monthFrom, monthTo, slpCode },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener los productos más vendidos:', error);
    return null;
  }
};