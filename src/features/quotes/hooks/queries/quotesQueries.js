import { getQuote, getQuoteById, getTransports } from "../../services/quoteService"
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