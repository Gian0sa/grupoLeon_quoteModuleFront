// hooks/useReportQueries.js
import { useQuery } from "@tanstack/react-query";
import {
  getAccountsReceivable
} from "../services/receivableService";

export const useGetAccountsReceivable = ({ vendedor, cliente ,clientecode, page = 1 }, enabled = true) => {
  return useQuery({
    queryKey: ["accountsReceivable", vendedor, cliente, clientecode, page],
    queryFn: () => getAccountsReceivable({ vendedor, cliente, clientecode, page }),
    enabled: Boolean(enabled),
  });
};
