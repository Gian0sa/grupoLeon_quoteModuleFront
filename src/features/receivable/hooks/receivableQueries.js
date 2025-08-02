// hooks/useReportQueries.js
import { useQuery } from "@tanstack/react-query";
import {
  getAccountsReceivable
} from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente, page = 1 }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, page],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, page }),
    enabled: Boolean(enabled),
  });
};
