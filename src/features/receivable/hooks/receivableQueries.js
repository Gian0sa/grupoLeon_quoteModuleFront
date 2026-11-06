import { useQuery } from "@tanstack/react-query";
import { getAccountsReceivable } from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente, clientecode, lastClient, skip = 0 }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, clientecode, lastClient, skip],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, clientecode, lastClient, skip }),
    enabled: Boolean(enabled),
    staleTime: 10 * 60 * 1000, // 10 minutos de frescura para navegación ultra fluida
    gcTime: 30 * 60 * 1000, // 30 minutos de persistencia en caché de memoria
    refetchOnMount: false, // Reutiliza datos si están en memoria en vez de recargar pesadamente
    refetchOnWindowFocus: false, // Evita disparar peticiones pesadas por focus o toques de pantalla
  });
};
