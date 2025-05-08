import { axiosInstance } from "../../../shared/lib/axiosInstance";

export const loginUser = async (credentials) => {
  const response = await axiosInstance.post("/api/login", credentials);
  return response.data;
};
