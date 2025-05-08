import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const fetchClientByCode = async (code) => {
  const response = await axiosInstance.get(`/api/clients/${code}`);
  return response.data;
}
