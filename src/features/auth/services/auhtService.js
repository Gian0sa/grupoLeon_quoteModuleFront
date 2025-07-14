import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { adaptUsertoSession } from "../adapters/authAdapter";

export const loginUser = async (credentials) => {
  const response = await axiosInstance.post("/authModule/login", adaptUsertoSession(credentials));
  console.log("el login responde con : ",response);
  return response.data;
};

export const registerUser = async (credentials) => {
  const response = await axiosInstance.post("/authModule/register", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await axiosInstance.post("/authModule/logout");
  return response.data;
};

export const refreshAccessToken = async () => {
  const response = await axiosInstance.get("/authModule/refresh-token");
  return response.data.token;
};

export const sellersData = async () => {
  const response = await axiosInstance.get("/authModule/sellers");
  return response.data;
};
