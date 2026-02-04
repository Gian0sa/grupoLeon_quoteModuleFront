import { useQuery } from "@tanstack/react-query";
import {
  getAllVisitLogs,
  getVisitLogById,
  getActiveVisitByVendor,
} from "../../services/visitLogService";

// Obtener todos los registros de visitas
export const useVisitLogs = () => {
  return useQuery({
    queryKey: ["visitLogs"],
    queryFn: getAllVisitLogs,
  });
};

// Obtener registro por ID
export const useVisitLogById = (id) => {
  return useQuery({
    queryKey: ["visitLog", id],
    queryFn: () => getVisitLogById(id),
    enabled: !!id,
  });
};

export const useActiveVisitByVendor = (vendorName) => {
  console.log(vendorName);
  return useQuery({
    queryKey: ["activeVisit", vendorName],
    queryFn: () => getActiveVisitByVendor(vendorName),
  });
};