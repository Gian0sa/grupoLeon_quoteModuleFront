import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVisitLog } from "../../services/visitLogService";

export const useCreateVisitLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => {
      return createVisitLog(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["visitLogs"]);
      queryClient.invalidateQueries(["activeVisit"]);
      queryClient.invalidateQueries(["myVisitLogs"]);
    },
    networkMode: "always",
  });
};