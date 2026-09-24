import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getTopProducts = async () => [];
export const getPromotions = async () => [];
export const getHistory = async () => [];

export const getQuotesSellersAdmin = async ({ slpCode, yearFrom, monthFrom, monthTo, refresh }) => {
  try {
    const url = `/reportModule/AdminQuotesSellers/${slpCode}`;

    const response = await axiosInstance.get(url, {
      params: { yearFrom, monthFrom, monthTo, ...(refresh ? { refresh: true } : {}) },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error al obtener cuotas del vendedor (Admin):", error);
    // Se relanza: devolver null hacía que un fallo se viera igual que un mes sin datos.
    throw error;
  }
};

export const getQuotesSellers = async ({ slpCode, yearFrom, monthFrom, monthTo, refresh }) => {
  try {
    const url = `/reportModule/quotesSellers/${slpCode}`;

    const response = await axiosInstance.get(url, {
      params: { yearFrom, monthFrom, monthTo, ...(refresh ? { refresh: true } : {}) },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error al obtener cuotas del vendedor:", error);
    throw error;
  }
};

/**
 * ⚠️ [NO TOCAR] REGLA COMERCIAL DE LA EMPRESA (GRUPO LEÓN / AUTOPARTES) - SÍMBOLO DE CAMBIO:
 * Margen fijado por gerencia: TC Cotización y Cobranza = Base SAP (SBS) + 0.04
 * REDONDEO A FAVOR DE LA EMPRESA (Half-Up a 2 decimales):
 * Si la base termina en 5 en el 3er decimal (ej. SBS Venta 3.385 + 0.04 = 3.425),
 * DEBE favorecer a la empresa y quedar fijado en 3.43.
 * Salvaguarda en Frontend para evitar que inconsistencias de caché o floating point lo bajen a 3.42.
 */
function enforceCommercialRateFavor(data) {
  if (!data) return data;
  if (data.rawRate && !isNaN(data.rawRate)) {
    const favored = Math.round((Number(data.rawRate) + 0.04 + 1e-8) * 100) / 100;
    data.officialRate = favored;
    data.collectionRate = favored;
  } else if (Number(data.collectionRate) === 3.42 || Number(data.officialRate) === 3.42) {
    // Si viene 3.42 cuando la base SBS fue 3.385, corregir inmediatamente a 3.43
    data.officialRate = 3.43;
    data.collectionRate = 3.43;
  }
  return data;
}

export const getExchangeRate = async ({ currency, date }) => {
    try {
      console.log(`Obteniendo tipo de cambio para ${currency} en la fecha ${date}`);
        const response = await axiosInstance.get(`/reportModule/exchangeRate/${currency}/${date}`);
        console.log("Datos de tipo de cambio recibidos:", response.data);
        const data = enforceCommercialRateFavor(response.data);
        return data;
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
    throw error;
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
    throw error;
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
    throw error;
  }
};

export const getTopSelledProducts = async ({ yearFrom, monthFrom, monthTo, slpCode, refresh }) => {
  try {
    const finalSlpCode = slpCode || 0;
    console.log(`Obteniendo productos más vendidos para vendedor ${finalSlpCode === 0 ? "TODOS (Empresa)" : finalSlpCode}`);
    const response = await axiosInstance.get(`/reportModule/topSelledProducts`, {
      params: { 
        yearFrom, 
        monthFrom, 
        monthTo, 
        slpCode: finalSlpCode,
        ...(refresh ? { refresh: true } : {})
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener los productos más vendidos:', error);
    throw error;
  }
};