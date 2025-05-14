import { getSupervisorQuotes } from "../../services/supervisorService"
import { useQuery } from "@tanstack/react-query"

export function useSupervisorQueries() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["supervisorQuotes"],
        queryFn: () => getSupervisorQuotes(),
    })
    return { data, isLoading, error }
}

