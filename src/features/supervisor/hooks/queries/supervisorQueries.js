import { getRequestQuote , getRequestQuoteById } from "../../services/supervisorService"
import { useQuery } from "@tanstack/react-query"

export const useGetRequestQuotes = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["RequestQuotes"],
        queryFn: () => getRequestQuote(),
    })
    return { data, isLoading, error }
}

export const useGetRequestQuoteById = (id) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["requestQuoteById", id],
        queryFn:  () => getRequestQuoteById(id),
        enabled: !!id,
    })
    return { data, isLoading, error }
}
