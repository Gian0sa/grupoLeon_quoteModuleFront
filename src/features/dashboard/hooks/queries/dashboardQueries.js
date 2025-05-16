import { useQuery } from "@tanstack/react-query";
import { getTopProducts, getPromotions, getHistory } from "../../services/dashboardService";
import { adaptTopProducts, adaptPromotions, adaptHistory } from "../../adapters/dashboardAdapter";

export function useDashboardQueries(){
    const { data: topProducts, isLoading: topProductsLoading, error: topProductsError } = useQuery({
        queryKey: ['topProducts'],
        queryFn: () => getTopProducts(),
    });
    const { data: promotions, isLoading: promotionsLoading, error: promotionsError } = useQuery({
        queryKey: ['promotions'],
        queryFn: () => getPromotions(),
    });
    const { data: history, isLoading: historyLoading, error: historyError } = useQuery({
        queryKey: ['history'],
        queryFn: () => getHistory(),
    });

    return {
        topProducts: adaptTopProducts(topProducts),
        promotions: adaptPromotions(promotions),
        history: adaptHistory(history),
        topProductsLoading,
        promotionsLoading,
        historyLoading,
        topProductsError,
        promotionsError,
        historyError,
    };
};

