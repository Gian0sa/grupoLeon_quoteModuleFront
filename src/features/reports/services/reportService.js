import { axiosInstance } from "../../../shared/lib/axiosInstance";

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
    return response.data;
  } catch (error) {
    console.error("Error al comparar orden y entrega:", error);
    return null;
  }
}

export const getOrderswithStatusReports = async ({
  salesPersonCode,
  estadopedido = '',
  page = 0,
  pageSize = 5,
}) => {
  try {

    const estado = estadopedido ? `'${estadopedido}'` : "''";

    const response = await axiosInstance.get(
      `/reportModule/orderswithStatus/${salesPersonCode}/${estado}`,
      {
        params: {
          pagina: page,
          pageSize,
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error al obtener Orders with Status:", error);
    return null;
  }
};

export const getInvoiceDeliveryNoteperOrder = async ({ docEntry }) => {
  try {

    const response = await axiosInstance.get(
      `/reportModule/invoiceDeliveryNoteperOrder/${docEntry}`
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error al obtener invoice/delivery note por orden:", error);
    return null;
  }
};

