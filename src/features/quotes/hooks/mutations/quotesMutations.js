 import { createQuote } from "../../services/quoteService"
 import { useMutation } from "@tanstack/react-query"
 import { useQuoteStore } from "../../stores/quoteStore"
 import { useNavigate } from "react-router-dom"


 export function useQuoteMutations() {
    const navigate = useNavigate()
    const createQuoteMutation = useMutation({
        mutationFn: createQuote,
        onSuccess: (data) => {
            console.log(data)
            useQuoteStore.getState().clear()
            navigate("/dashboard")
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const updateQuoteMutation = useMutation({
        mutationFn: updateQuote,
        onSuccess: (data) => {
            console.log(data)
        },
        onError: (error) => {
            console.log(error)
        },
    })
    return { createQuoteMutation, updateQuoteMutation }
}