import { useQuery } from "@tanstack/react-query";
import {
  getAllVisitLogs,
  getVisitLogById,
  getActiveVisitByVendor,
  getMyVisitLogs,
  getClientImage,
} from "../../services/visitLogService";

export const useVisitLogs = () => {
  return useQuery({
    queryKey: ["visitLogs"],
    queryFn: getAllVisitLogs,
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
    queryFn: () => getActiveVisitByVendor(vendorName),
  });
};

export const useMyVisitLogs = () => {
  return useQuery({
    queryKey: ["myVisitLogs"],
    queryFn: getMyVisitLogs,
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
