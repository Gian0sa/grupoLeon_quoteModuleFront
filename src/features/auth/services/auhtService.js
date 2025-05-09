import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { adaptUsertoSession } from "../adapters/authAdapter";

export const loginUser = async (credentials) => {
  console.log(adaptUsertoSession(credentials));
  const response = await axiosInstance.post("/v1/login", adaptUsertoSession(credentials));
  return response.data;
};

export const registerUser = async (credentials) => {
  const response = await axiosInstance.post("/v1/register", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await axiosInstance.post("/v1/logout");
  return response.data;
};
