import { approveQuote, rejectQuote } from "../../services/supervisorService"
import { useMutation } from "@tanstack/react-query"

export function useSupervisorMutations() {
    const approveQuoteMutation = useMutation({
        mutationFn: approveQuote,
        onSuccess: (data) => {
            console.log(data)
        },
        onError: (error) => {
            console.log(error)
        },
    })
    const rejectQuoteMutation = useMutation({
        mutationFn: rejectQuote,
        onSuccess: (data) => {
            console.log(data)
        },
        onError: (error) => {
            console.log(error)
        },
    })
    return { approveQuoteMutation, rejectQuoteMutation }
}


