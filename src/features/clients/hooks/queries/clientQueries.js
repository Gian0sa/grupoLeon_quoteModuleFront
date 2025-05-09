import { useQuery } from "@tanstack/react-query";
import { fetchClientByCode } from "../../services/clientService";
import { adaptClientFromApi } from "../../adapters/clientAdapter";

export function useClientQueries(){
    const {data, isLoading, error} = useQuery({
        queryKey: ["client", code],
        queryFn: () => fetchClientByCode(code),
    });

    return {
        client: adaptClientFromApi(data),
        isLoading,
        error,
    };
}
