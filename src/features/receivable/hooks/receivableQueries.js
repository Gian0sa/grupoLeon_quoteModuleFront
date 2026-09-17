import { useQuery } from "@tanstack/react-query";
import { getAccountsReceivable } from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente, clientecode, lastClient, skip = 0 }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, clientecode, lastClient, skip],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, clientecode, lastClient, skip }),
    enabled: Boolean(enabled),
    staleTime: 20 * 1000, // 20s para mantener la cartera siempre fresca y sincronizada con SAP
    refetchOnWindowFocus: true, // Recargar automáticamente cuando el usuario regresa a la pestaña
  });
};
