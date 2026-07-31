import { useQuery } from "@tanstack/react-query";
import { 
  getTopProducts, 
  getPromotions, 
  getHistory, 
  getQuotesSellers,
  getQuotesSellersAdmin,
  getExchangeRate,
  getDashboardMotives,
  getOrdersCancelated,
  getTopCanceledProducts,
  getTopSelledProducts
} from "../../services/dashboardService";
import { 
  adaptTopProducts, 
  adaptPromotions, 
  adaptHistory
} from "../../adapters/dashboardAdapter";

import {
  getNotifications,
  getNotificationById,
} from "../../services/notificationService";

const STORAGE_KEY_SUMMARY = "antigravity_dashboard_summary_cache";

// Utility para guardar y leer cache local instantáneo
const saveSummaryCache = (data) => {
  try {
    if (data) {
      localStorage.setItem(STORAGE_KEY_SUMMARY, JSON.stringify(data));
    }
  } catch (e) {
    console.error("Error saving summary cache:", e);
  }
};

const getSummaryCache = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_SUMMARY);
    return cached ? JSON.parse(cached) : undefined;
  } catch (e) {
    return undefined;
  }
};

// ✅ Hook para Top Products
export const useTopProducts = () => {
  return useQuery({
    queryKey: ['topProducts'],
    queryFn: async () => {
      const data = await getTopProducts();
      return adaptTopProducts(data);
    },
    staleTime: 10 * 60 * 1000,
  });
};

// ✅ Hook para Promotions
export const usePromotions = () => {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const data = await getPromotions();
      return adaptPromotions(data);
    },
    staleTime: 10 * 60 * 1000,
  });
};

// ✅ Hook para History
export const useHistory = () => {
  return useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const data = await getHistory();
      return adaptHistory(data);
    },
    staleTime: 10 * 60 * 1000,
  });
};

// ✅ Hook para Quotes by Seller (V3)
export const useQuotesSellers = ({ slpCode, yearFrom, monthFrom, monthTo, skip = 0, pageSize = 20 }) => {
  return useQuery({
    queryKey: ['quotesSellers', slpCode, yearFrom, monthFrom, monthTo, skip, pageSize],
    queryFn: async () => {
      const res = await getQuotesSellers({ slpCode, yearFrom, monthFrom, monthTo, skip, pageSize });
      saveSummaryCache(res);
      return res;
    },
    enabled: slpCode != null && yearFrom != null && monthFrom != null && monthTo != null,
    staleTime: 10 * 60 * 1000, // 10 minutos fresco
    gcTime: 60 * 60 * 1000, // 1 hora en memoria
    placeholderData: () => getSummaryCache(),
  });
};

// ✅ Hook para Quotes by Seller (Admin) (V3)
export const useQuotesSellersAdmin = ({ slpCode, yearFrom, monthFrom, monthTo }) => {
  return useQuery({
    queryKey: ['quotesSellersAdmin', slpCode, yearFrom, monthFrom, monthTo],
    queryFn: async () => {
      const res = await getQuotesSellersAdmin({ slpCode, yearFrom, monthFrom, monthTo });
      saveSummaryCache(res);
      return res;
    },
    enabled: slpCode != null && yearFrom != null && monthFrom != null && monthTo != null,
    staleTime: 10 * 60 * 1000, // 10 minutos fresco
    gcTime: 60 * 60 * 1000, // 1 hora en memoria
    placeholderData: () => getSummaryCache(),
  });
};

// ✅ Obtener todas las notificaciones
export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    staleTime: 5 * 60 * 1000,
  });
};

// ✅ Obtener una notificación por ID
export const useNotificationById = (id) => {
  return useQuery({
    queryKey: ["notification", id],
    queryFn: () => getNotificationById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// ✅ Obtener tipo de cambio
export const useExchangeRate = ({ currency, date }) => {
    return useQuery({
        queryKey: ['exchangeRate', currency, date],
        queryFn: () => getExchangeRate({ currency, date }),
        enabled: !!currency && !!date,
        staleTime: 30 * 60 * 1000, // Tipo de cambio fresco 30 min
    });
};

// ✅ Motivos de anulación
export const useDashboardMotives = () => {
  return useQuery({
    queryKey: ['dashboardMotives'],
    queryFn: getDashboardMotives,
    staleTime: 10 * 60 * 1000,
  });
};

// ✅ Pedidos cancelados
export const useOrdersCancelated = () => {
  return useQuery({
    queryKey: ['ordersCancelated'],
    queryFn: getOrdersCancelated,
    staleTime: 10 * 60 * 1000,
  });
};

// ✅ Top productos cancelados
export const useTopCanceledProducts = () => {
  return useQuery({
    queryKey: ['topCanceledProducts'],
    queryFn: getTopCanceledProducts,
    staleTime: 10 * 60 * 1000,
  });
};
export const useTopCanceled = useTopCanceledProducts;

// ✅ Top productos vendidos
export const useTopSelledProducts = () => {
  return useQuery({
    queryKey: ['topSelledProducts'],
    queryFn: getTopSelledProducts,
    staleTime: 10 * 60 * 1000,
  });
};
export const useTopSelled = useTopSelledProducts;