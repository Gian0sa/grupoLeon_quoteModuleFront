import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const fetchPurchaseOrdersImportacion = async () => {
    const endpoint = `/reportModule/purchaseOrdersImportacion`;
    const response = await axiosInstance.get(endpoint);
    return response.data;
};

export const fetchBackOrderDemands = async (params = {}) => {
    const endpoint = `/quoteModule/quotes/backorders`;
    const response = await axiosInstance.get(endpoint, { params });
    return response.data;
};

