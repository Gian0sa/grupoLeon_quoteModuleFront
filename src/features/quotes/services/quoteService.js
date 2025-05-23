import { axiosInstance } from "../../../shared/lib/axiosInstance"

export const getQuoteDraft = async () => {
    const response = await axiosInstance.get('/getQuoteDrafts')
    return response.data
}

export const getQuoteDraftById = async (id) => {
    try {
        console.log("id del service", id);
        const response = await axiosInstance.get(`/getQuoteDraft/${id}`);
        console.log("response", response.data);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la cotización:", error);
        return null;
    }
}


export const createQuoteDraft = async (quote) => {
    const response = await axiosInstance.post('/createQuoteDraft', quote)
    return response.data
}

export const updateQuoteDraft = async (quote) => {
    const response = await axiosInstance.put(`/updateQuoteDraft/${quote.id}`, quote)
    return response.data
}

export const getQuoteConfirmed = async () => {
    const response = await axiosInstance.get('/getQuoteConfirmed')
    return response.data
}

export const getQuoteConfirmedById = async (id) => {
    const response = await axiosInstance.get(`/getQuoteConfirmed/${id}`)
    return response.data
}

export const createConfirmedQuote = async (quote) => {
    const response = await axiosInstance.put(`/createQuoteConfirmed`, quote)
    return response.data
}

export const updateConfirmedQuote = async (quote) => {
    const response = await axiosInstance.put(`/updateQuoteConfirmed/${quote.id}`, quote)
    return response.data
}

export const getTransports = async () => {
    const response = await axiosInstance.get(`/transports/clients`);
    return response.data;

  };


