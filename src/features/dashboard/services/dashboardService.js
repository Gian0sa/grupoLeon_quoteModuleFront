import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getTopProducts = async () => {
    const response = await axiosInstance.get('/quoteModule/dashboard/top-products');
    return response.data;
};

export const getPromotions = async () => {
    const response = await axiosInstance.get('/quoteModule/dashboard/promotions');
    return response.data;
};

export const getHistory = async () => {
    const response = await axiosInstance.get('/quoteModule/dashboard/history');
    return response.data;
};


