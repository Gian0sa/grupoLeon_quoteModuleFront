 import { useMutation } from "@tanstack/react-query"
 import { useQuoteStore } from "../../stores/quoteStore"
 import { useNavigate } from "react-router-dom"
 import { createQuoteDraft, updateQuoteDraft, createConfirmedQuote } from "../../services/quoteService"

 export function useQuoteMutations() {
    const navigate = useNavigate()
    const createQuoteDraftMutation = useMutation({
        mutationFn: createQuoteDraft,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const updateQuoteDraftMutation = useMutation({
        mutationFn: updateQuoteDraft,
        onSuccess: (data) => {
            console.log(data)
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const approveQuoteMutation = useMutation({
        mutationFn: createConfirmedQuote,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    return { createQuoteDraftMutation, updateQuoteDraftMutation, approveQuoteMutation }
}