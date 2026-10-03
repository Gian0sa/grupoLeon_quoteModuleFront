import { useQuery } from "@tanstack/react-query";
import { getAccountsReceivable } from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente, clientecode, lastClient, skip = 0 }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, clientecode, lastClient, skip],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, clientecode, lastClient, skip }),
    enabled: Boolean(enabled),
    staleTime: 30 * 1000, // 30 segundos de frescura para reflejar cambios rápidos
    refetchOnMount: true, // Recargar datos frescos al entrar a la pantalla
    refetchOnWindowFocus: false, // Evita disparar peticiones pesadas por eventos táctiles/focus en navegadores móviles (iOS/Chrome)
  });
};
