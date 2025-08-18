import axios from "axios";
import { useAuthStore } from "../../features/auth/stores/useAuthStore";

let isRefreshing = false;
let isSapRefreshing = false;
let failedQueue = [];
let sapFailedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const processSapQueue = (error, success = false) => {
  sapFailedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(success);
    }
  });

  sapFailedQueue = [];
};

// Función para detectar si es un request a SAP
const isSapRequest = (url) => {
  // Ajusta estos patrones según tus endpoints SAP reales
  return url.includes('/sap') || 
         url.includes('/SAP') || 
         url.includes('/sellers') ||
         url.includes('/businesspartner') || 
         url.includes('/item') ||
         url.includes('/query') || 
         url.includes('/report');
};

// Función para detectar errores de SAP
const isSapAuthError = (error) => {
  if (!error.response) return false;
  
  const status = error.response.status;
  const data = error.response.data;
  const url = error.config?.url || '';
  
  // Solo considerar como error de SAP si la URL es de SAP
  if (!isSapRequest(url)) return false;
  
  return (
    status === 401 ||
    status === 403 ||
    (typeof data === 'string' && data.toLowerCase().includes('unauthorized')) ||
    (typeof data === 'object' && (
      data.error?.message?.toLowerCase().includes('unauthorized') ||
      data.error?.message?.toLowerCase().includes('invalid') ||
      data.message?.toLowerCase().includes('unauthorized')
    ))
  );
};

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

    console.log("el token queenvia dle interceptor es : ",token)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['x-access-token'] = token;
    }

    // Obtener las cookies SAP desde el store
    const sapCookies = useAuthStore.getState().sapCookies;

    if (sapCookies && sapCookies.length > 0) {
      // Extraemos solo el NAME=VALUE para cada cookie, descartando opciones
      const sapCookiesStr = sapCookies
        .map(cookieStr => cookieStr.split(';')[0].trim())
        .join('; ');

      // Enviar en header personalizado (no en Cookie)
      config.headers['X-SAP-Cookies'] = sapCookiesStr;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isJwtAuthError = error.response?.status === 401;
    const isSapError = isSapAuthError(error);

    let path = "";
    try {
      const url = new URL(originalRequest.url, axiosInstance.defaults.baseURL);
      path = url.pathname;
    } catch (e) {
      console.warn("⚠️ No se pudo resolver la URL del request:", originalRequest.url);
    }

    const isLoginOrRegister = ["/authModule/login", "/authModule/register"].includes(path);

    // =============== MANEJO DE ERRORES SAP (PRIORIDAD) ===============
    if (isSapError && !originalRequest._sapRetry && !isLoginOrRegister) {
      originalRequest._sapRetry = true;

      if (isSapRefreshing) {
        return new Promise((resolve, reject) => {
          sapFailedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isSapRefreshing = true;
      try {
        console.log('🔄 SAP credentials expired, renewing session...');
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/authModule/refresh-sap-session`,
          {},
          { 
            withCredentials: true,
            headers: {
              'Authorization': axiosInstance.defaults.headers.common["Authorization"]
            }
          }
        );

        if (res.data.success && res.data.sapCookies) {
          console.log('✅ SAP session renewed successfully');
          
          // Actualizar las cookies SAP en el store
          useAuthStore.getState().setSapCookies(res.data.sapCookies);
          
          processSapQueue(null, true);
          return axiosInstance(originalRequest);
        } else {
          throw new Error('SAP session renewal failed');
        }
      } catch (err) {
        console.error('❌ SAP session renewal failed:', err);
        processSapQueue(err, false);
        
        // Si falla la renovación de SAP, hacer logout
        //useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isSapRefreshing = false;
      }
    }

    // =============== MANEJO DE ERRORES JWT (para requests no-SAP) ===============
    if (isJwtAuthError && !isSapRequest(originalRequest.url) && !originalRequest._retry && !isLoginOrRegister) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        console.log('🔄 Refreshing JWT token...');
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/authModule/refresh-token`,
          {},
          {
            withCredentials: true,
          }
        );

        const newToken = res.data.token;
        useAuthStore.getState().setToken(newToken);

        // Si el refresh también renovó cookies SAP, actualizarlas
        if (res.data.sapCookies && res.data.sapCookies.length > 0) {
          useAuthStore.getState().setSapCookies(res.data.sapCookies);
          console.log('✅ SAP cookies also renewed during JWT refresh');
        }

        axiosInstance.defaults.headers.common["Authorization"] = "Bearer " + newToken;
        processQueue(null, newToken);

        console.log('✅ JWT token refreshed successfully');
        return axiosInstance(originalRequest);
      } catch (err) {
        console.error('❌ JWT refresh failed:', err);
        processQueue(err, null);
        //useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);