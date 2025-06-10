import { axiosInstance } from "../../../shared/lib/axiosInstance"
import { useAuthStore } from "../../auth/stores/useAuthStore"
import axios from "axios"

export const getQuote = async () => {
    const response = await axiosInstance.get('/quoteModule/quotes')
    return response.data
}

export const getQuoteById = async (id) => {
    try {
        const response = await axiosInstance.get(`/quoteModule/quotes/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la cotización:", error);
        return null;
    }
}

export const createQuote = async (quote) => {
    const response = await axiosInstance.post('/quoteModule/quotes', quote)
    return response.data
}

export const updateQuote = async (quote) => {
    console.log(quote);
    const response = await axiosInstance.put(`/quoteModule/quotes/${quote.id}`, quote)
    return response.data
}

export const getTransports = async () => {
    const response = await axiosInstance.get(`/quoteModule/clients/transports`);
    return response.data.value;

};

export const getPaymentType = async () => {
    const response = await axiosInstance.get(`/quoteModule/clients/payment-terms`);
    return response.data.value;
}

export const getDeliveryForms = async () => {
    const response = await axiosInstance.get(`/quoteModule/clients/delivery-forms`);
    return response.data;
}

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
  
    const token = useAuthStore.getState().token;
  
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/quoteModule/images`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    return response.data;
  };
  
  export const deleteImage = async (imagePath) => {
    const response = await axiosInstance.delete(`/quoteModule/images`, {
      data: { imagePath },
    });
    return response.data;
  };
  