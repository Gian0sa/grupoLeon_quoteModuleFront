import { getProducts } from "../../services/productService"
import { useQuery } from "@tanstack/react-query"

export function useProductQueries() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["products"],
        queryFn: () => getProducts(),
    })
    return { data, isLoading, error }
}

