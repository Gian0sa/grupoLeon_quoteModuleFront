import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const fetchClientByCode = async (code) => {
  const response = await axiosInstance.get(`/quoteModule/clients/${code}`);
  return response.data;
}

export const fetchClientByName = async (name) => {
  const response = await axiosInstance.get(`/quoteModule/clients/name/${name}`);
  return response.data;
}

export const fetchDeliveryPoints = async (id) => {
  const response = await axiosInstance.get(`/quoteModule/clients/${id}/delivery-points`);
  return response.data;
}

export const createClient = async (client) => {
  const response = await axiosInstance.post(`/quoteModule/clients`, client);
  return response.data;
}

export const updateClient = async (client) => {
  const response = await axiosInstance.put(`/quoteModule/clients/${client.id}`, client);
  return response.data;
}

export const fetchClientProductHistory = async ({ clientQuery, slpCode }) => {
  console.log(clientQuery, slpCode);
    const encodedEndpoint = `/reportModule/historyClient?clientQuery=${encodeURIComponent(clientQuery)}&slpCode=${slpCode}`;

    const response = await axiosInstance.get(encodedEndpoint);
    return response.data;
}

export const fetchClientProductHistoryAdmin = async ({ clientQuery }) => {
    console.log(clientQuery);
    const encodedEndpoint = `/reportModule/historyClientAdmin?clientQuery=${encodeURIComponent(clientQuery)}`;

    const response = await axiosInstance.get(encodedEndpoint);
    return response.data;
}

export const fetchPriceListByItemCodes = async ({ itemCodes }) => {
    if (!itemCodes || (Array.isArray(itemCodes) && itemCodes.length === 0)) {
        throw new Error('itemCodes es requerido');
    }

    const itemCodesCsv = Array.isArray(itemCodes)
        ? itemCodes.join(',')
        : itemCodes;
    
    const encodedItemCodes = encodeURIComponent(itemCodesCsv);

    const endpoint = `/reportModule/priceListByItemCodes?itemCodes=${encodedItemCodes}`;

    console.log('Fetching price list:', itemCodesCsv);

    const response = await axiosInstance.get(endpoint);
    return response.data;
};

export const fetchPurchaseOrdersImportacion = async (page = 1, pageSize = 20) => {
    const endpoint = `/reportModule/purchaseOrdersImportacion`;

    console.log(`Fetching Purchase Orders - Page: ${page}, PageSize: ${pageSize}`);

    const response = await axiosInstance.get(endpoint, {
        params: {
            page,
            pageSize
        }
    });
    
    return response.data;
};

export const fetchPurchaseOrderDetail = async (docEntry) => {
    const endpoint = `/reportModule/purchaseOrdersImportacion/${docEntry}`;

    console.log(`Fetching Purchase Order Detail - DocEntry: ${docEntry}`);

    const response = await axiosInstance.get(endpoint);
    return response.data;
};