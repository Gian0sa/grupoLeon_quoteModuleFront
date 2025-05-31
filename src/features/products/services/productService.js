import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getProductDetail = async (code) => {
    const response = await axiosInstance.get(`/quotes/products/${code}`);
    console.log("Product details fetched:", response.data);
    return response.data;
};

