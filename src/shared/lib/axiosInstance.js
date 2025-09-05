import axios from "axios";

let isRefreshing = false;
let failedQueue = [];

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, 
  headers: { "Content-Type": "application/json" },
});

// Interceptor de respuesta
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isJwtAuthError = status === 401;

    // 🔹 Asegurar que originalRequest exista (a veces axios lanza errores de red sin config)
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 🔹 Determinar ruta
    let path = "";
    try {
      const url = new URL(originalRequest.url, axiosInstance.defaults.baseURL);
      path = url.pathname;
    } catch {
      path = originalRequest.url; // fallback
    }

    const isAuthRoute = [
      "/authModule/login",
      "/authModule/register",
      "/authModule/refresh-token",
    ].includes(path);

    // 🔹 Manejo único de JWT (SAP se refresca en backend)
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
        failedQueue.forEach((p) => p.resolve(true));
        failedQueue = [];
        return axiosInstance(originalRequest);
      } catch (err) {
        console.error("❌ JWT refresh failed:", err);
        failedQueue.forEach((p) => p.reject(err));
        failedQueue = [];
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
