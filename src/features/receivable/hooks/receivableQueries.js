import { useQuery } from "@tanstack/react-query";
import { getAccountsReceivable } from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente, clientecode, lastClient, skip = 0 }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, clientecode, lastClient, skip],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, clientecode, lastClient, skip }),
    enabled: Boolean(enabled),
    staleTime: 5 * 60 * 1000, // 5 minutos de caché para evitar consultas masivas repetitivas
    refetchOnWindowFocus: false, // Evita disparar peticiones pesadas por eventos táctiles/focus en navegadores móviles (iOS/Chrome)
  });
};
