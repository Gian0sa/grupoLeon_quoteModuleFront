import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export const fetchClientByCode = async (code) => {
  const response = await axiosInstance.get(`/clients/${code}`);
  console.log(axiosInstance);
  return response.data;
}

export const fetchDeliveryPoints = async (id) => {
  const response = await axiosInstance.get(`/clients/${id}/delivery-point`);
  return response.data;
}

export const createClient = async (client) => {
  const response = await axiosInstance.post(`/clients`, client);
  return response.data;
}

export const updateClient = async (client) => {
  const response = await axiosInstance.put(`/clients/${client.id}`, client);
  return response.data;
}


