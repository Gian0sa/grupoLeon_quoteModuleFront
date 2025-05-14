import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getTopProducts = async () => {
    const response = await axiosInstance.get('/dashboard/top-products');
    return response.data;
};

export const getPromotions = async () => {
    const response = await axiosInstance.get('/dashboard/promotions');
    return response.data;
};

export const getHistory = async () => {
    const response = await axiosInstance.get('/dashboard/history');
    return response.data;
};


