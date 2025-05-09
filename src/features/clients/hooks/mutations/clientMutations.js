

export function useClientMutations(){
    const updateClientMutation = useMutation({
        mutationFn: updateClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", code] });
        },
        onError: (error) => {
            console.error("Error al actualizar el cliente:", error);
        },
    });
    const createClientMutation = useMutation({
        mutationFn: createClient,
        onSuccess: () => {
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
        },
    };
}