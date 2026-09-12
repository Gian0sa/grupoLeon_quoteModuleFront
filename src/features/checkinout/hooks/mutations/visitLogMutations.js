import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVisitLog } from "../../services/visitLogService";

export const useCreateVisitLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => {
      return createVisitLog(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitLogs"] });
      queryClient.invalidateQueries({ queryKey: ["activeVisit"] });
      queryClient.invalidateQueries({ queryKey: ["myVisitLogs"] });
    },
    networkMode: "always",
  });
};
