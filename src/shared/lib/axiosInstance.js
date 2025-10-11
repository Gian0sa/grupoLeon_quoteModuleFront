import axios from "axios";
import { logoutUser } from "../../features/auth/services/auhtService";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";

let isRefreshing = false;
let failedQueue = [];

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  // headers: { "Content-Type": "application/json" },
});

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Interceptor de respuesta
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isJwtAuthError = status === 401;

    if (!originalRequest) return Promise.reject(error);

    let path = "";
    try {
      const url = new URL(originalRequest.url, axiosInstance.defaults.baseURL);
      path = url.pathname;
    } catch {
      path = originalRequest.url;
    }

    const isAuthRoute = [
      "/authModule/login",
      "/authModule/refresh-token",
    ].includes(path);

    const authStore = useAuthStore.getState();

    // 🔹 Manejo de JWT expirada
    if (isJwtAuthError && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          failedQueue.push({ resolve, reject })
        ).then(() => axiosInstance(originalRequest));
      }

      isRefreshing = true;
      try {
        await axiosInstance.post("/authModule/refresh-token", {}, { withCredentials: true });
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (err) {
        console.error("❌ JWT refresh failed:", err);
        processQueue(err);

        // 🔹 Logout automático
        try {
          await logoutUser(); // llama backend para limpiar cookies
        } catch (logoutErr) {
          console.warn("Logout backend failed", logoutErr);
        }
        authStore.logout(); // limpia Zustand + localStorage
        
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
