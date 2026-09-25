import {
    getQuote,
    getQuotes,
    getQuoteById,
    getTransports,
    getPaymentType,
    getDeliveryForms,
    getWarehouses,
    getNotifications,
} from "../../services/quoteService"
import { useQuery } from "@tanstack/react-query"

export const useGetQuotes = (filters = {}) => {
    const query = useQuery({
        queryKey: ["quotes", filters],
        queryFn: () => getQuotes(filters),
        staleTime: 30000, // 1 minuto de caché; Socket.io actualiza en tiempo real
        refetchOnWindowFocus: false,
        placeholderData: (previousData) => previousData,
    })
    const safeData = Array.isArray(query.data) ? query.data : (query.data?.quotes || []);
    return { ...query, data: safeData, pagination: !Array.isArray(query.data) ? query.data : null, isLoading: query.isLoading, isFetching: query.isFetching, error: query.error }
}

export const useQuotes = useGetQuotes;

export const useNotifications = (targetRole, targetUsername) => {
    const query = useQuery({
        queryKey: ["notifications", targetRole, targetUsername],
        queryFn: () => getNotifications(targetRole, targetUsername),
        staleTime: 5 * 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    })
    return { ...query, data: query.data || [], isLoading: query.isLoading, isFetching: query.isFetching, error: query.error }
}

export const useGetQuoteById = (id, { enabled = true } = {}) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteById", id],
        queryFn:  () => getQuoteById(id),
        enabled: enabled && !!id,
        staleTime: 0,
        refetchOnMount: "always",
        retry: false,
    })
    return { data, isLoading, error }
}

export const useGetTransports = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["transports"],
        queryFn: () => getTransports(),
    })
    return { dataTransports: data, isLoadingTransports: isLoading, errorTransports: error }
}

export const useGetPaymentType = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["paymentType"],
        queryFn: () => getPaymentType(),
        select: (data) => {
            if (data && data.value) {
                return data.value;
            }
            return data || [];
        },
    })
    return { dataPaymentTypes: data, isLoadingPaymentTypes: isLoading, errorPaymentTypes: error }
}

export const useGetDeliveryForms = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["deliveryForms"],
        queryFn: () => getDeliveryForms(),
    })
    return { dataDeliveryForms: data, isLoadingDeliveryForms: isLoading, errorDeliveryForms: error }
}

export const useGetWarehouses = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["warehouses"],
        queryFn: () => getWarehouses(),
    })
    return { warehouses: data || [], isLoading, error };
};


export const useIgvRate = () => {
    return { igvRate: 0.18, isLoading: false };
};

import { fetchActivePromotions } from "../../services/promotionService";

export const useGetPromotions = () => {
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["productPromotions"],
        queryFn: fetchActivePromotions,
        staleTime: 60000,
        refetchOnWindowFocus: true,
    });

    const list = data?.list || [];
    const activePromotions = data?.activeList || list.filter(p => {
        if (p.isExpired) return false;
        if (!p.validUntil) return true;
        const end = new Date(p.validUntil);
        if (isNaN(end.getTime())) return true;
        const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
        return endOfDay.getTime() >= Date.now();
    });

    const expiredPromotions = data?.expiredList || list.filter(p => !activePromotions.includes(p));

    return {
        promotions: list,
        activePromotions,
        expiredPromotions,
        activeCount: activePromotions.length,
        expiredCount: expiredPromotions.length,
        promotionsMap: data?.map || {},
        isLoading,
        isFetching,
        refetch,
    };
};
