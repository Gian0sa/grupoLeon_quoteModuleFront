import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { adaptUsertoSession } from "../adapters/authAdapter";

export const loginUser = async (credentials) => {
  const response = await axiosInstance.post("/login", adaptUsertoSession(credentials));
  return response.data;
};

export const registerUser = async (credentials) => {
  const response = await axiosInstance.post("/register", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await axiosInstance.post("/logout");
  return response.data;
};
