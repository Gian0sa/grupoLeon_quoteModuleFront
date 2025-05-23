import { getQuoteDraft, getQuoteConfirmed, getQuoteDraftById, getTransports } from "../../services/quoteService"
import { useQuery } from "@tanstack/react-query"

export const useGetQuotesDraft = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteDraft"],
        queryFn: () => getQuoteDraft(),
    })
    return { data, isLoading, error }
}

export const useGetQuoteDraftById = (id) => {
    console.log("id adsa",id);
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteDraftById", id],
        queryFn:  () => getQuoteDraftById(id),
        enabled: !!id,
    })
    console.log("data",data);
    return { data, isLoading, error }
}

export const useGetQuotesConfirmed = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteConfirmed"],
        queryFn: () => getQuoteConfirmed(),
    })
    return { data, isLoading, error }
}

export const useGetQuoteConfirmedById = (id) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["quoteConfirmedById", id],
        queryFn: () => getQuoteConfirmedById(id),
    })
    return { data, isLoading, error }
}

export const useGetTransports = () => {
    const {data , isLoading , error } = useQuery({
        queryKey: ["quoteTransports"],
        queryFn: () => getTransports(),
    })
    return{ dataTransports : data , isLoadingTransports:isLoading , errorTransports:error }
}