import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getReportsBySalesperson = async (
  id,
  pagina = 1,
  porPagina = 10,
  estadoOrdenFiltro = [],
  startDate = null,
  endDate = null
) => {
  try {
    const params = {
      pagina,
      porPagina,
      ...(estadoOrdenFiltro.length > 0
        ? { estadoOrdenFiltro: estadoOrdenFiltro.join(",") }
        : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    };

    const response = await axiosInstance.get(`/reportModule/reports/${id}`, {
      params,
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

export const getAccountsReceivable = async ({ vendedor, cliente }) => {
  try {
    let url = `/accountsReceivable?vendedor=${vendedor}`;
    if (cliente) {
      url += `&cliente=${cliente}`;
    }

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return null;
  }
};

export const getcompareOrderAndDelivery = async (orderCode, deliveryCode) => {
  try {
    const response = await axiosInstance.get(`/reportModule/compareOrderDelivery/${orderCode}/${deliveryCode}`);
    console.log("Respuesta de la comparación:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error al comparar orden y entrega:", error);
    return null;
  }
}

export const getOrdersReports = async ({
  salesPersonCode,
  page = 0,
  pageSize = 10,
  startDate = null,
  endDate = null
}) => {
  try {
    const response = await axiosInstance.get(
      `/reportModule/ordersReports/${salesPersonCode}`, // 👈 en el path
      {
        params: {
          pagina: page,        // 👈 usa "pagina" en lugar de "page"
          pageSize,            // si el backend no usa esto, lo puedes quitar
          startDate,
          endDate
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error al obtener órdenes:", error);
    return null;
  }
};

