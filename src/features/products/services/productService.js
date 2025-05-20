import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getProducts = async (field, value) => {
    const response = await axiosInstance.get(`products?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`);
    return response.data;
};

export const getProductDetail = async (code) => {
    const response = await axiosInstance.get(`productdetails/${code}`);
    return response.data;
};

