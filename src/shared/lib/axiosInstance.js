import axios from "axios";
import {logoutUser} from "../../features/auth/services/auhtService";
import {useAuthStore} from "../../features/auth/stores/useAuthStore";

let isRefreshing = false;
let failedQueue = [];

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL, withCredentials: true,
    // headers: { "Content-Type": "application/json" },
});

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) 
            prom.reject(error);
         else 
            prom.resolve(token);
        
    });
    failedQueue = [];
};

// Interceptor de respuesta
axiosInstance.interceptors.response.use((res) => res, async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isJwtAuthError = status === 401;

    if (!originalRequest) 
        return Promise.reject(error);

    // 🔹 Si el dispositivo está sin conexión (Offline), no intentar refresh ni forzar logout
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
        return Promise.reject(error);
    }

    let path = "";
    try {
        const url = new URL(originalRequest.url, axiosInstance.defaults.baseURL);
        path = url.pathname;
    } catch {
        path = originalRequest.url;
    }

    // También reconoce baseURL con prefijo /api y URLs con query string.
    // Logout no debe esperar al mismo refresh que lo está ejecutando.
    const isAuthRoute = /(?:^|\/)authModule\/(?:login|refresh-token|logout)\/?$/.test(
        String(path || "").split(/[?#]/)[0]
    );
    const authStore = useAuthStore.getState();

    // Mitigacion: Si el backend indica que la cuenta fue desactivada (403)
    const isDeactivated = status === 403 && (
        error.response?.data?.deactivated ||
        /inactive|inactiv/i.test(String(error.response?.data?.message || ''))
    );
    if (isDeactivated) {
        console.warn("⛔ Cuenta desactivada detectada en petición HTTP (403). Expulsando de inmediato...");
        try {
            sessionStorage.setItem("logoutReason", "Tu cuenta ha sido desactivada por el administrador.");
            await logoutUser();
        } catch (_) {}
        authStore.logout();
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
            window.location.href = "/?reason=deactivated";
        }
        return Promise.reject(error);
    }

    // 🔹 Manejo de JWT expirada (solo en línea)
    if (isJwtAuthError && !originalRequest._retry && !isAuthRoute) {
        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => failedQueue.push({resolve, reject})).then(() => axiosInstance(originalRequest));
        }

        isRefreshing = true;
        try {
            await axiosInstance.post("/authModule/refresh-token", {}, {withCredentials: true});
            processQueue(null);
            return axiosInstance(originalRequest);
        } catch (err) {
            console.error("❌ JWT refresh failed:", err);
            processQueue(err);

            // 🔹 Logout automático solo si el token expiró definitivamente en el servidor (401 / 403) estando ONLINE
            const refreshStatus = err?.response?.status;
            const stillOnline = typeof navigator !== "undefined" && navigator.onLine;
            if (stillOnline && (refreshStatus === 401 || refreshStatus === 403)) {
                try {
                    await logoutUser(); // llama backend para limpiar cookies
                } catch (logoutErr) {
                    console.warn("Logout backend failed", logoutErr);
                }
                authStore.logout(); // limpia Zustand + localStorage
                if (typeof window !== "undefined" && window.location.pathname !== "/") {
                    const isDeact = refreshStatus === 403 && (err?.response?.data?.deactivated || /inactive|inactiv/i.test(String(err?.response?.data?.message || '')));
                    if (isDeact) {
                        try { sessionStorage.setItem("logoutReason", "Tu cuenta ha sido desactivada por el administrador."); } catch (_) {}
                    }
                    window.location.href = isDeact ? "/?reason=deactivated" : "/";
                }
            }

            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }

    return Promise.reject(error);
});
