import { axiosInstance } from "../../../shared/lib/axiosInstance"

export const createQuote = async (quote) => {
    const response = await axiosInstance.post('/quotes', quote)
    return response.data
}

export const updateQuote = async (quote) => {
    const response = await axiosInstance.put(`/quotes/${quote.id}`, quote)
    return response.data
}
