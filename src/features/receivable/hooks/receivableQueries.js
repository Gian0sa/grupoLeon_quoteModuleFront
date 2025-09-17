import { useQuery } from "@tanstack/react-query";
import { getAccountsReceivable } from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente, clientecode, lastClient }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, clientecode, lastClient],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, clientecode, lastClient }),
    enabled: Boolean(enabled),
  });
};
