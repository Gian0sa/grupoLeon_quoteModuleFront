import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const getTopProducts = async () => {
    const response = await axiosInstance.get('/quotes/dashboard/top-products');
    return response.data;
};

export const getPromotions = async () => {
    const response = await axiosInstance.get('/quotes/dashboard/promotions');
    return response.data;
};

export const getHistory = async () => {
    const response = await axiosInstance.get('/quotes/dashboard/history');
    return response.data;
};


