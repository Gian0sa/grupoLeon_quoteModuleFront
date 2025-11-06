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

// ✅ Hook para Quotes by Seller (V3)
export const useQuotesSellers = ({ slpCode, yearFrom, monthFrom, monthTo, skip = 0, pageSize = 20 }) => {
  return useQuery({
    queryKey: ['quotesSellers', slpCode, yearFrom, monthFrom, monthTo, skip, pageSize],
    queryFn: () => getQuotesSellers({ slpCode, yearFrom, monthFrom, monthTo, skip, pageSize }),
    enabled: slpCode != null && yearFrom != null && monthFrom != null && monthTo != null,
  });
};

// ✅ Hook para Quotes by Seller (Admin) (V3)
export const useQuotesSellersAdmin = ({ slpCode, yearFrom, monthFrom, monthTo }) => {
  return useQuery({
    queryKey: ['quotesSellersAdmin', slpCode, yearFrom, monthFrom, monthTo],
    queryFn: () => getQuotesSellersAdmin({ slpCode, yearFrom, monthFrom, monthTo }),
    enabled: slpCode != null && yearFrom != null && monthFrom != null && monthTo != null,
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
    enabled: !!id, // solo si hay id
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

export const useDashboardMotives = ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  console.log(`useDashboardMotives llamado con: yearFrom=${yearFrom}, monthFrom=${monthFrom}, monthTo=${monthTo}, sellerCode=${slpCode}`);
  return useQuery({
    queryKey: ['dashboardMotives', yearFrom, monthFrom, monthTo, slpCode],
    queryFn: () => getDashboardMotives({ yearFrom, monthFrom, monthTo, slpCode }),
    enabled: !!yearFrom && !!monthFrom && !!monthTo,
  });
};

export const useOrdersCancelated = ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  console.log(`useOrdersCancelated llamado con: yearFrom=${yearFrom}, monthFrom=${monthFrom}, monthTo=${monthTo}, slpCode=${slpCode}`);
  
  return useQuery({
    queryKey: ['ordersCancelated', yearFrom, monthFrom, monthTo, slpCode],
    queryFn: () => getOrdersCancelated({ yearFrom, monthFrom, monthTo, slpCode }),
    enabled: !!yearFrom && !!monthFrom && !!monthTo,
  });
};

export const useTopCanceled = ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  console.log(`useTopCanceled llamado con: yearFrom=${yearFrom}, monthFrom=${monthFrom}, monthTo=${monthTo}, slpCode=${slpCode}`);
  
  return useQuery({
    queryKey: ['topCanceled', yearFrom, monthFrom, monthTo, slpCode],
    queryFn: () => getTopCanceledProducts({ yearFrom, monthFrom, monthTo, slpCode }),
    enabled: !!yearFrom && !!monthFrom && !!monthTo,
  });
};


export const useTopSelled = ({ yearFrom, monthFrom, monthTo, slpCode }) => {
  console.log(`useTopSelled llamado con: yearFrom=${yearFrom}, monthFrom=${monthFrom}, monthTo=${monthTo}, slpCode=${slpCode}`);
  
  return useQuery({
    queryKey: ['topSelled', yearFrom, monthFrom, monthTo, slpCode],
    queryFn: () => getTopSelledProducts({ yearFrom, monthFrom, monthTo, slpCode }),
    enabled: !!yearFrom && !!monthFrom && !!monthTo,
  });
};