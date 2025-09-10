import { useQuery } from "@tanstack/react-query";
import { 
  getTopProducts, 
  getPromotions, 
  getHistory, 
  getQuotesSellers,
  getQuotesSellersAdmin
} from "../../services/dashboardService";
import { 
  adaptTopProducts, 
  adaptPromotions, 
  adaptHistory
} from "../../adapters/dashboardAdapter";

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

// ✅ Hook para Quotes by Seller
export const useQuotesSellers = ({ slpCode, month }) => {
  return useQuery({
    queryKey: ['quotesSellers', slpCode, month],
    queryFn: () => getQuotesSellers({ slpCode, month }),
    enabled: slpCode != null && month != null,
  });
};

export const useQuotesSellersAdmin = ({ slpCode, month }) => {
  return useQuery({
    queryKey: ["quotesSellersAdmin", slpCode, month,],      
    queryFn: () => getQuotesSellersAdmin ({ slpCode, month }),
    enabled: slpCode != null && month != null,
  });
};