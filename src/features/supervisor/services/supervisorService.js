import { axiosInstance } from "../../../shared/lib/axiosInstance"

export const getSupervisorQuotes = async () => {
    const response = await axiosInstance.get('/supervisor/quotes')
    return response.data
}

export const approveQuote = async (quoteId) => {
    const response = await axiosInstance.put(`/supervisor/quotes/${quoteId}/approve`)
    return response.data
}

export const rejectQuote = async (quoteId) => {
    const response = await axiosInstance.put(`/supervisor/quotes/${quoteId}/reject`)
    return response.data
}





