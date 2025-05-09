import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const fetchClientByCode = async (code) => {
  const response = await axiosInstance.get(`/api/clients/${code}`);
  return response.data;
}

export const createClient = async (client) => {
  const response = await axiosInstance.post(`/api/clients`, client);
  return response.data;
}

export const updateClient = async (client) => {
  const response = await axiosInstance.put(`/api/clients/${client.id}`, client);
  return response.data;
}


