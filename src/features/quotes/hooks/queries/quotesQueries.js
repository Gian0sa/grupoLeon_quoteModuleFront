import {
    getQuote,
    getQuotes,
    getQuoteById,
    getTransports,
    getPaymentType,
    getDeliveryForms,
    getWarehouses,
    getHouseBankAccounts,
    getNotifications,
} from "../../services/quoteService"
import { useQuery } from "@tanstack/react-query"

export const useGetQuotes = (filters = {}) => {
    const query = useQuery({
        queryKey: ["quotes", filters],
        queryFn: () => getQuotes(filters),
        staleTime: 30000, // 30 segundos de caché; Socket.io actualiza instantáneamente con cero delay
        refetchOnWindowFocus: true,
    })
    return { ...query, data: query.data || [], isLoading: query.isLoading, isFetching: query.isFetching, error: query.error }
}

export const useQuotes = useGetQuotes;

export const useNotifications = (targetRole, targetUsername) => {
    const query = useQuery({
        queryKey: ["notifications", targetRole, targetUsername],
        queryFn: () => getNotifications(targetRole, targetUsername),
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
    })
    return { ...query, data: query.data || [], isLoading: query.isLoading, isFetching: query.isFetching, error: query.error }
}

export const useGetQuoteById = (id) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteById", id],
        queryFn:  () => getQuoteById(id),
        enabled: !!id,
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

export const useGetHouseBankAccounts = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["houseBankAccounts"],
        queryFn: () => getHouseBankAccounts(),
    })
    return { dataHouseBankAccounts: data || [], isLoading, error };
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
    return {
        promotions: data?.list || [],
        promotionsMap: data?.map || {},
        isLoading,
        isFetching,
        refetch,
    };
};