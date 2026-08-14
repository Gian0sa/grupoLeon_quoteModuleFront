import {
    getQuote,
    getQuotes,
    getQuoteById,
    getTransports,
    getPaymentType,
    getDeliveryForms,
    getNotifications,
} from "../../services/quoteService"
import { useQuery } from "@tanstack/react-query"

export const useGetQuotes = (filters = {}) => {
    const query = useQuery({
        queryKey: ["quotes", filters],
        queryFn: () => getQuotes(filters),
        refetchInterval: 5000, // Live poll every 5 seconds for real-time multi-user sync
        refetchOnWindowFocus: true,
    })
    return { ...query, data: query.data || [], isLoading: query.isLoading, error: query.error }
}

export const useQuotes = useGetQuotes;

export const useNotifications = (targetRole, targetUsername) => {
    const query = useQuery({
        queryKey: ["notifications", targetRole, targetUsername],
        queryFn: () => getNotifications(targetRole, targetUsername),
        refetchInterval: 5000, // Live poll every 5 seconds
        refetchOnWindowFocus: true,
    })
    return { ...query, data: query.data || [], isLoading: query.isLoading, error: query.error }
}

export const useGetQuoteById = (id) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteById", id],
        queryFn:  () => getQuoteById(id),
        enabled: !!id,
        refetchInterval: 5000,
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
    return { warehouses: [], isLoading: false };
};

export const useIgvRate = () => {
    return { igvRate: 0.18, isLoading: false };
};

// export const useGetExchangeRate = () => {
//     const { data, isLoading, error } = useQuery({
//         queryKey: ["ExchangeRatio"],
//         queryFn: () => getDeliveryForms(),
//     })
//     return { dataDeliveryForms: data, isLoadingDeliveryForms: isLoading, errorDeliveryForms: error }

// }