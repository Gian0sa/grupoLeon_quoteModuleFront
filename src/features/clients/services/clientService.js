import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export const fetchClientByCode = async (code) => {
  const response = await axiosInstance.get(`/quotes/clients/${code}`);
  return response.data;
}

export const fetchDeliveryPoints = async (id) => {
  const response = await axiosInstance.get(`/quotes/clients/${id}/delivery-points`);
  return response.data;
}

export const createClient = async (client) => {
  const response = await axiosInstance.post(`/quotes/clients`, client);
  return response.data;
}

export const updateClient = async (client) => {
  const response = await axiosInstance.put(`/quotes/clients/${client.id}`, client);
  return response.data;
}


