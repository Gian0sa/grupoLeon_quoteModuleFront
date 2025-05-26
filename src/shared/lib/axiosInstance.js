import axios from "axios";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";

const token = useAuthStore.getState().token;

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
  },
});
