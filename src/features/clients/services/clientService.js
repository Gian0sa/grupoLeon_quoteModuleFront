import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const fetchClientByCode = async (code) => {
  const response = await axiosInstance.get(`/quoteModule/clients/${code}`);
  return response.data;
}

export const fetchDeliveryPoints = async (id) => {
  const response = await axiosInstance.get(`/quoteModule/clients/${id}/delivery-points`);
  return response.data;
}

export const createClient = async (client) => {
  const response = await axiosInstance.post(`/quoteModule/clients`, client);
  return response.data;
}

export const updateClient = async (client) => {
  const response = await axiosInstance.put(`/quoteModule/clients/${client.id}`, client);
  return response.data;
}


