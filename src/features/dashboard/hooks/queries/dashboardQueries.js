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

// Limpieza de claves antiguas de cache local si existieran
try {
  localStorage.removeItem("antigravity_dashboard_summary_cache");
} catch (e) {
  // Ignore
}

// ✅ Hook para Top Products
export const useTopProducts = () => {
  return useQuery({
    queryKey: ['topProducts'],
    queryFn: async () => {
      const data = await getTopProducts();
      return adaptTopProducts(data);
    },
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
  });
};

// ✅ Hook para Quotes by Seller (V3) - Consulta directa a backend sin cacheo local de usuario
export const useQuotesSellers = ({ slpCode, yearFrom, monthFrom, monthTo, skip = 0, pageSize = 20 }) => {
  return useQuery({
    queryKey: ['quotesSellers', slpCode, yearFrom, monthFrom, monthTo, skip, pageSize],
    queryFn: () => getQuotesSellers({ slpCode, yearFrom, monthFrom, monthTo, skip, pageSize }),
    enabled: slpCode != null && yearFrom != null && monthFrom != null && monthTo != null,
    staleTime: 0, // Siempre datos frescos por usuario
    refetchOnMount: "always", // El QueryClient global tiene refetchOnMount:false; esta query sí debe refrescar siempre al montar
  });
};

// ✅ Hook para Quotes by Seller (Admin) (V3) - Consulta directa a backend sin cacheo local de usuario
export const useQuotesSellersAdmin = ({ slpCode, yearFrom, monthFrom, monthTo }) => {
  return useQuery({
    queryKey: ['quotesSellersAdmin', slpCode, yearFrom, monthFrom, monthTo],
    queryFn: () => getQuotesSellersAdmin({ slpCode, yearFrom, monthFrom, monthTo }),
    enabled: slpCode != null && yearFrom != null && monthFrom != null && monthTo != null,
    staleTime: 0, // Siempre datos frescos por usuario
    refetchOnMount: "always", // El QueryClient global tiene refetchOnMount:false; esta query sí debe refrescar siempre al montar
  });
};

// ✅ Obtener todas las notificaciones
export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
};

// ✅ Obtener una notificación por ID
export const useNotificationById = (id) => {
  return useQuery({
    queryKey: ["notification", id],
    queryFn: () => getNotificationById(id),
    enabled: !!id,
  });
};

// ✅ Obtener tipo de cambio
export const useExchangeRate = ({ currency, date }) => {
    return useQuery({
        queryKey: ['exchangeRate', currency, date],
        queryFn: () => getExchangeRate({ currency, date }),
        enabled: !!currency && !!date,
    });
};

// ✅ Motivos de anulación
export const useDashboardMotives = () => {
  return useQuery({
    queryKey: ['dashboardMotives'],
    queryFn: getDashboardMotives,
  });
};

// ✅ Pedidos cancelados
export const useOrdersCancelated = () => {
  return useQuery({
    queryKey: ['ordersCancelated'],
    queryFn: getOrdersCancelated,
  });
};

// ✅ Top productos cancelados
export const useTopCanceledProducts = () => {
  return useQuery({
    queryKey: ['topCanceledProducts'],
    queryFn: getTopCanceledProducts,
  });
};
export const useTopCanceled = useTopCanceledProducts;

// ✅ Top productos vendidos
export const useTopSelledProducts = () => {
  return useQuery({
    queryKey: ['topSelledProducts'],
    queryFn: getTopSelledProducts,
  });
};
export const useTopSelled = useTopSelledProducts;