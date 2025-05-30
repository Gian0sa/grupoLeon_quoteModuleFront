import { axiosInstance } from "../../../shared/lib/axiosInstance"
import { useAuthStore } from "../../auth/stores/useAuthStore"
import axios from "axios"

export const getQuoteDraft = async () => {
    const response = await axiosInstance.get('/getQuoteDrafts')
    return response.data
}

export const getQuoteDraftById = async (id) => {
    try {
        const response = await axiosInstance.get(`/getQuoteDraft/${id}`);
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
    console.log(quote);
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

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
  
    const token = useAuthStore.getState().token;
  
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/upload-image`,
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
    const response = await axiosInstance.delete(`/delete-image`, {
      data: { imagePath },
    });
    return response.data;
  };
  