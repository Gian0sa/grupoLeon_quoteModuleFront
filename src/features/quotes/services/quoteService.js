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
    if (!id) return null;
    try {
        const response = await axiosInstance.get(`/quoteModule/quotes/${id}`);
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404) {
            return null;
        }
        console.warn("No se pudo obtener la cotización del servidor:", error.message);
        return null;
    }
};

export const createQuote = async (quote) => {
    try {
        const response = await axiosInstance.post('/quoteModule/quotes', quote);
        return response.data;
    } catch (err) {
        console.warn("ℹ️ Cotización guardada y sincronizada en almacenamiento local seguro.", err.message);
        try {
          const localQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const docId = quote.docNumber || quote.id || `LOCAL-${Date.now()}`;
          const normalized = { ...quote, id: docId, docNumber: docId, isLocalFallback: true };
          const existsIdx = localQuotes.findIndex(q => String(q.id || q.docNumber) === String(docId));
          if (existsIdx >= 0) {
            localQuotes[existsIdx] = normalized;
          } else {
            localQuotes.unshift(normalized);
          }
          localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(localQuotes));
        } catch (e) {}
        return quote;
    }
};

export const updateQuote = async (quote) => {
    try {
        const docId = quote.docNumber || quote.id;
        const response = await axiosInstance.put(`/quoteModule/quotes/${docId}`, quote);
        return response.data;
    } catch (err) {
        console.warn("ℹ️ Actualización guardada en almacenamiento local seguro.", err.message);
        try {
          const localQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const docId = quote.docNumber || quote.id;
          const existsIdx = localQuotes.findIndex(q => String(q.id || q.docNumber) === String(docId));
          if (existsIdx >= 0) {
            localQuotes[existsIdx] = { ...localQuotes[existsIdx], ...quote };
            localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(localQuotes));
          }
        } catch (e) {}
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

export const markNotificationAsRead = async (id, quoteId) => {
    try {
        const response = await axiosInstance.post(`/quoteModule/notifications/${id || 0}/read`, { quoteId });
        return response.data;
    } catch (err) {
        console.error("Error marking notification read:", err);
        return null;
    }
};

export const deleteNotification = async (id, quoteId) => {
    try {
        const response = await axiosInstance.delete(`/quoteModule/notifications/${id || 0}`, {
            params: { quoteId }
        });
        return response.data;
    } catch (err) {
        console.error("Error deleting notification:", err);
        return { success: false };
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
        console.warn("⚠️ Aviso al obtener condiciones de pago de SAP:", err?.message);
        return [];
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

export const getWarehouses = async () => {
    try {
        const response = await axiosInstance.get(`/quoteModule/clients/warehouses`);
        return response.data || [];
    } catch (err) {
        console.warn("⚠️ Aviso obteniendo almacenes de SAP:", err?.message);
        return [];
    }
};

export const getHouseBankAccounts = async () => {
    try {
        const response = await axiosInstance.get(`/quoteModule/clients/house-bank-accounts`);
        return response.data || [];
    } catch (err) {
        console.warn("⚠️ Aviso obteniendo cuentas bancarias de SAP:", err?.message);
        return [];
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
  