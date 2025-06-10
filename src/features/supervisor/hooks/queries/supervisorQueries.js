import { getSupervisorQuotes } from "../../services/supervisorService"
import { useQuery } from "@tanstack/react-query"

export function useSupervisorQueries(quoteId) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["supervisorQuotes"],
        queryFn: () => getSupervisorQuotes(),
    })
    const { data: quoteDetail, isLoading: quoteDetailLoading, error: quoteDetailError } = useQuery({
        queryKey: ["supervisorQuoteDetail", quoteId],
        queryFn: () => getSupervisorQuoteDetail(quoteId),
        enabled: !!quoteId,
    })
    return { data, isLoading, error, quoteDetail, quoteDetailLoading, quoteDetailError }
}
