import { axiosInstance } from "../../../shared/lib/axiosInstance"
import { useAuthStore } from "../../auth/stores/useAuthStore"
import axios from "axios"

export const getQuoteDraft = async () => {
    const response = await axiosInstance.get('/quotes/draft-quotes')
    return response.data
}

export const getQuoteDraftById = async (id) => {
    try {
        const response = await axiosInstance.get(`/quotes/draft-quotes/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la cotización:", error);
        return null;
    }
}


export const createQuoteDraft = async (quote) => {
    const response = await axiosInstance.post('/quotes/draft-quotes', quote)
    return response.data
}

export const updateQuoteDraft = async (quote) => {
    console.log(quote);
    const response = await axiosInstance.put(`/quotes/draft-quotes/${quote.id}`, quote)
    return response.data
}

export const getQuoteConfirmed = async () => {
    const response = await axiosInstance.get('/quotes/confirmed-quotes')
    return response.data
}

export const getQuoteConfirmedById = async (id) => {
    const response = await axiosInstance.get(`/quotes/confirmed-quotes/${id}`)
    return response.data
}

export const createConfirmedQuote = async (quote) => {
    const response = await axiosInstance.post(`/quotes/confirmed-quotes`, quote)
    return response.data
}

export const updateConfirmedQuote = async (quote) => {
    const response = await axiosInstance.put(`/quotes/confirmed-quotes/${quote.id}`, quote)
    return response.data
}

export const getTransports = async () => {
    const response = await axiosInstance.get(`/quotes/clients/transports`);
    return response.data;

};

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
  
    const token = useAuthStore.getState().token;
  
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/quotes/images`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    console.log(response.data);
    return response.data;
  };
  
  export const deleteImage = async (imagePath) => {
    const response = await axiosInstance.delete(`/quotes/images`, {
      data: { imagePath },
    });
    return response.data;
  };
  