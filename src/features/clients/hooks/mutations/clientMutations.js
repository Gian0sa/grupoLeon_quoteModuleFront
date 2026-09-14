

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, updateClient } from "../../services/clientService";

export function useClientMutations(){
    const queryClient = useQueryClient();

    const updateClientMutation = useMutation({
        mutationFn: updateClient,
        onSuccess: (_data, variables) => {
            const code = variables?.id || variables?.CardCode || variables?.code;
            queryClient.invalidateQueries({ queryKey: ["client", code] });
        },
        onError: (error) => {
            console.error("Error al actualizar el cliente:", error);
        },
    });
    const createClientMutation = useMutation({
        mutationFn: createClient,
        onSuccess: (_data, variables) => {
            const code = variables?.id || variables?.CardCode || variables?.code;
            queryClient.invalidateQueries({ queryKey: ["client", code] });
        },
        onError: (error) => {
            console.error("Error al crear el cliente:", error);
        },
    });
    return {
        updateClient : {
            mutate: updateClientMutation.mutate,
            isPending: updateClientMutation.isPending,
            isError: updateClientMutation.isError,
            error: updateClientMutation.error,
        },
        createClient : {
            mutate: createClientMutation.mutate,
            isPending: createClientMutation.isPending,
            isError: createClientMutation.isError,
            error: createClientMutation.error,
        }
    };
}
