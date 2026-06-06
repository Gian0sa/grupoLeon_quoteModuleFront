import { useQuery } from "@tanstack/react-query";
import {
  getAllVisitLogs,
  getVisitLogById,
  getActiveVisitByVendor,
  getMyVisitLogs,
  getClientImage,
} from "../../services/visitLogService";
import { getActiveVisitState } from "../../services/visitLogQueue";

export const useVisitLogs = (filters) => {
  return useQuery({
    queryKey: ["visitLogs", filters],
    queryFn: () => getAllVisitLogs(filters),
    keepPreviousData: true,
  });
};

export const useVisitLogById = (id) => {
  return useQuery({
    queryKey: ["visitLog", id],
    queryFn: () => getVisitLogById(id),
    enabled: !!id,
  });
};

export const useActiveVisitByVendor = (vendorName) => {
  return useQuery({
    queryKey: ["activeVisit", vendorName],
    queryFn: async () => {
      let serverData = null;
      try {
        serverData = await getActiveVisitByVendor(vendorName);
      } catch (error) {
        console.warn("Could not fetch active visit from server (offline):", error);
      }
      return getActiveVisitState(vendorName, serverData);
    },
    networkMode: "always",
  });
};

export const useMyVisitLogs = () => {
  return useQuery({
    queryKey: ["myVisitLogs"],
    queryFn: getMyVisitLogs,
    networkMode: "always",
  });
};

export const useClientImage = (sapCode) => {
  return useQuery({
    queryKey: ["clientImage", sapCode],
    queryFn: () => getClientImage(sapCode),
    enabled: !!sapCode,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
