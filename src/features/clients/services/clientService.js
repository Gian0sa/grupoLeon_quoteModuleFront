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

export const fetchSapStates = async () => {
  try {
    const response = await axiosInstance.get(`/quoteModule/clients/states`);
    return response.data || [];
  } catch (err) {
    console.warn("⚠️ No se pudieron obtener departamentos desde SAP:", err.message);
    return [];
  }
}


export const checkClientExists = async (documentNumber) => {
  const cleanDoc = String(documentNumber || "").trim().replace(/\D/g, "");
  if (!cleanDoc) return { exists: false, client: null };
  const response = await axiosInstance.get(`/quoteModule/clients/check-exists/${cleanDoc}`);
  return response.data;
};

export const consultSunatRuc = async (ruc) => {
  const cleanRuc = String(ruc || "").trim().replace(/\D/g, "");
  if (!cleanRuc || cleanRuc.length !== 11) return null;
  const response = await axiosInstance.get(`/quoteModule/clients/sunat/ruc/${cleanRuc}`);
  return response.data;
};

export const consultSunatDni = async (dni) => {
  const cleanDni = String(dni || "").trim().replace(/\D/g, "");
  if (!cleanDni || cleanDni.length !== 8) return null;
  const response = await axiosInstance.get(`/quoteModule/clients/sunat/dni/${cleanDni}`);
  return response.data;
};

export const updateClient = async (client) => {
  const response = await axiosInstance.put(`/quoteModule/clients/${client.id}`, client);
  return response.data;
}

export const fetchClientProductHistory = async (params = {}) => {
    const clientQuery = typeof params === 'string' ? params : (params?.clientQuery || params?.code || params?.CardCode || "");
    const slpCode = typeof params === 'object' ? (params?.slpCode || "") : "";
    if (!clientQuery) return [];
    try {
        const encodedEndpoint = `/reportModule/historyClient?clientQuery=${encodeURIComponent(clientQuery)}&slpCode=${slpCode}`;
        const response = await axiosInstance.get(encodedEndpoint);
        return response.data || [];
    } catch (err) {
        console.warn("ℹ️ No se pudo obtener el historial del cliente:", err.message);
        return [];
    }
}

export const fetchClientProductHistoryAdmin = async (params = {}) => {
    const clientQuery = typeof params === 'string' ? params : (params?.clientQuery || params?.code || params?.CardCode || "");
    if (!clientQuery) return [];
    try {
        const encodedEndpoint = `/reportModule/historyClientAdmin?clientQuery=${encodeURIComponent(clientQuery)}`;
        const response = await axiosInstance.get(encodedEndpoint);
        return response.data || [];
    } catch (err) {
        console.warn("ℹ️ No se pudo obtener el historial admin del cliente:", err.message);
        return [];
    }
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

export const fetchNewClients = async ({ vendorCode, username }) => {
    const response = await axiosInstance.get(`/reportModule/new-clients`, {
        params: { vendorCode, username }
    });
    return response.data;
};

export const searchNewClients = async (searchTerm) => {
    if (!searchTerm || typeof searchTerm !== "string" || !searchTerm.trim()) {
        return [];
    }
    const response = await axiosInstance.get(`/reportModule/new-clients`, {
        params: { search: searchTerm.trim(), all: "true" }
    });
    return response.data || [];
};

export const updateNewClient = async ({ id, ...clientData }) => {
    const response = await axiosInstance.put(`/reportModule/new-clients/${id}`, clientData);
    return response.data;
};