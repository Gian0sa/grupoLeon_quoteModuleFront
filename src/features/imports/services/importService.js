import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const fetchPurchaseOrdersImportacion = async () => {
    const endpoint = `/reportModule/purchaseOrdersImportacion`;
    console.log(endpoint);
    const response = await axiosInstance.get(endpoint);
    console.log(response.data);
    return response.data;
};
