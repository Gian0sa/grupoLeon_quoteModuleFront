import { getQuote, getQuoteById, getTransports ,getPaymentType , getDeliveryForms} from "../../services/quoteService"
import { useQuery } from "@tanstack/react-query"

export const useGetQuotes = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quotes"],
        queryFn: () => getQuote(),
    })
    return { data, isLoading, error }
}

export const useGetQuoteById = (id) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteById", id],
        queryFn:  () => getQuoteById(id),
        enabled: !!id,
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