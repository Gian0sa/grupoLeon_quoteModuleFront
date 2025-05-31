import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { adaptUsertoSession } from "../adapters/authAdapter";

export const loginUser = async (credentials) => {
  const response = await axiosInstance.post("/auth/login", adaptUsertoSession(credentials));
  return response.data;
};

export const registerUser = async (credentials) => {
  const response = await axiosInstance.post("/auth/register", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const refreshAccessToken = async () => {
  const response = await axiosInstance.get("/auth/refresh-token");
  return response.data.token;
};
