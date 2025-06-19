import { axiosInstance } from "../../../shared/lib/axiosInstance"

export const getRequestQuote = async () => {
    const response = await axiosInstance.get('/approveModule/requestQuotes')
    return response.data
}

export const getRequestQuoteById = async (id) => {
    try {
        const response = await axiosInstance.get(`/approveModule/requestQuotes/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la cotización:", error);
        return null;
    }
}

export const updateRequestQuote = async (quote) => {
    const response = await axiosInstance.put(`/approveModule/requestQuotes/${quote.id}`)
    return response.data
}
