import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getProductDetail = async (code) => {
    const response = await axiosInstance.get(`/quoteModule/products/${code}`);
    return response.data;
};

