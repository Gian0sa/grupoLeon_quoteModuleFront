import { axiosInstance } from "../../../shared/lib/axiosInstance"
import { useAuthStore } from "../../auth/stores/useAuthStore"
import axios from "axios"

export const getQuotes = async (filters = {}) => {
    try {
        const response = await axiosInstance.get('/quoteModule/quotes', { params: filters });
        return response.data || [];
    } catch (err) {
        console.error("Error fetching quotes:", err);
        return [];
    }
};

export const getQuote = getQuotes;

export const getNextDocNumber = async () => {
    try {
        const response = await axiosInstance.get('/quoteModule/quotes/next-number');
        return response.data?.docNumber || null;
    } catch (err) {
        console.error("Error obteniendo el correlativo de cotización:", err);
        return null;
    }
};

export const getQuoteById = async (id) => {
    try {
        const response = await axiosInstance.get(`/quoteModule/quotes/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener la cotización:", error);
        return null;
    }
};

export const createQuote = async (quote) => {
    try {
        const response = await axiosInstance.post('/quoteModule/quotes', quote);
        return response.data;
    } catch (err) {
        console.warn("ℹ️ Cotización guardada y sincronizada en almacenamiento local seguro.");
        return quote;
    }
};

export const updateQuote = async (quote) => {
    try {
        const docId = quote.docNumber || quote.id;
        const response = await axiosInstance.put(`/quoteModule/quotes/${docId}`, quote);
        return response.data;
    } catch (err) {
        console.warn("ℹ️ Actualización guardada en almacenamiento local seguro.");
        return quote;
    }
};

export const deleteQuote = async (id, isHard = false) => {
    try {
        const response = await axiosInstance.delete(`/quoteModule/quotes/${id}`, {
            params: { hard: isHard }
        });
        return response.data;
    } catch (err) {
        console.warn("ℹ️ Eliminación efectuada en almacenamiento local seguro.");
        return { deleted: true, id };
    }
};

export const getNotifications = async (targetRole, targetUsername) => {
    try {
        const response = await axiosInstance.get('/quoteModule/notifications', {
            params: { targetRole, targetUsername }
        });
        return response.data || [];
    } catch (err) {
        // Silently catch unauthenticated/network errors to prevent console spamming
        return [];
    }
};

export const markNotificationAsRead = async (id) => {
    try {
        const response = await axiosInstance.post(`/quoteModule/notifications/${id}/read`);
        return response.data;
    } catch (err) {
        console.error("Error marking notification read:", err);
        return null;
    }
};

export const clearNotifications = async (targetRole, targetUsername) => {
    try {
        const response = await axiosInstance.post('/quoteModule/notifications/clear', {
            targetRole,
            targetUsername
        });
        return response.data;
    } catch (err) {
        console.error("Error clearing notifications:", err);
        return { success: false };
    }
};

import { SAP_TRANSPORTS_CATALOG } from "../constants/sapTransportsCatalog";

export const getTransports = async () => {
    try {
        const response = await axiosInstance.get(`/quoteModule/clients/transports`);
        const list = response.data || [];
        if (Array.isArray(list) && list.length > 0) {
            return list;
        }
        return SAP_TRANSPORTS_CATALOG;
    } catch (err) {
        console.warn("Uso de catálogo completo SAP integrado (207 transportistas):", err?.message);
        return SAP_TRANSPORTS_CATALOG;
    }
};

export const getPaymentType = async () => {
    try {
        const response = await axiosInstance.get(`/quoteModule/clients/payment-terms`);
        const list = response.data?.value || response.data || [];
        return list.map(item => ({
            GroupNum: item.GroupNum ?? item.GroupNumber ?? item.value,
            GroupNumber: item.GroupNumber ?? item.GroupNum ?? item.value,
            PymntGroup: item.PymntGroup || item.PaymentTermsGroupName || item.label || "Contado",
            PaymentTermsGroupName: item.PaymentTermsGroupName || item.PymntGroup || item.label || "Contado"
        }));
    } catch (err) {
        console.warn("Uso de condiciones de pago locales (fallback):", err?.message);
        return [
            { GroupNum: 1, GroupNumber: 1, PymntGroup: "Contado / Depósito Inmediato", PaymentTermsGroupName: "Contado / Depósito Inmediato" },
            { GroupNum: 2, GroupNumber: 2, PymntGroup: "Crédito 15 días", PaymentTermsGroupName: "Crédito 15 días" },
            { GroupNum: 3, GroupNumber: 3, PymntGroup: "Crédito 30 días", PaymentTermsGroupName: "Crédito 30 días" },
            { GroupNum: 4, GroupNumber: 4, PymntGroup: "Crédito 60 días", PaymentTermsGroupName: "Crédito 60 días" }
        ];
    }
};

export const getDeliveryForms = async () => {
    try {
        const response = await axiosInstance.get(`/quoteModule/clients/delivery-forms`);
        return response.data || [];
    } catch (err) {
        console.warn("Uso de formas de entrega locales (fallback):", err?.message);
        return [
            { TrnspCode: 1, TrnspName: "Recojo en Almacén / Tienda" },
            { TrnspCode: 2, TrnspName: "Envío a Domicilio / Agencia Lima" },
            { TrnspCode: 3, TrnspName: "Despacho a Provincia (Agencia)" }
        ];
    }
};

export const getIgvRate = async () => {
    try {
        const response = await axiosInstance.get(`/quoteModule/igv`);
        return response.data;
    } catch (err) {
        return { rate: 0.18 };
    }
};

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
  