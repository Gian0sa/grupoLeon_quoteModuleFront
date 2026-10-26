import {useQuery} from "@tanstack/react-query";
import {
    getAllVisitLogs,
    getVisitLogById,
    getActiveVisitByVendor,
    getMyVisitLogs,
    getClientImage,
    getVisitingVendors
} from "../../services/visitLogService";
import {getActiveVisitState} from "../../services/visitLogQueue";

export const useVisitLogs = (filters) => {
    return useQuery({
        queryKey: [
            "visitLogs", filters
        ],
        queryFn: () => getAllVisitLogs(filters),
        keepPreviousData: true,
        refetchOnMount: true,
        staleTime: 0
    });
};

export const useVisitLogById = (id) => {
    return useQuery({
        queryKey: [
            "visitLog", id
        ],
        queryFn: () => getVisitLogById(id),
        enabled: !!id
    });
};

export const useActiveVisitByVendor = (vendorName, vendorCode) => {
    return useQuery({
        queryKey: [
            "activeVisit", vendorName, vendorCode
        ],
        queryFn: async () => {
            let serverData = null;
            if (vendorName) {
                try {
                    serverData = await Promise.race([
                        getActiveVisitByVendor(vendorName),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error("Timeout obteniendo visita activa")), 5000)
                        )
                    ]);
                } catch (error) {
                    console.warn("Could not fetch active visit from server (offline or timeout):", error);
                }
            }
            try {
                return await getActiveVisitState(vendorName, serverData, vendorCode);
            } catch (queueErr) {
                console.error("Error evaluating local active visit state:", queueErr);
                return { active: serverData?.active || false, visit: serverData?.visit || null };
            }
        },
        enabled: Boolean(vendorName),
        networkMode: "always",
        staleTime: 1000 * 10,
        retry: 1
    });
};

export const useMyVisitLogs = () => {
    return useQuery({
        queryKey: ["myVisitLogs"],
        queryFn: getMyVisitLogs,
        networkMode: "always",
        refetchOnMount: true,
        staleTime: 0
    });
};

export const useClientImage = (sapCode) => {
    return useQuery({
        queryKey: [
            "clientImage", sapCode
        ],
        queryFn: () => getClientImage(sapCode),
        enabled: !!sapCode,
        staleTime: 1000 * 60 * 5,
        retry: 1
    });
};

export const useVisitingVendors = () => {
    return useQuery({
        queryKey: ["visitingVendors"],
        queryFn: getVisitingVendors,
        staleTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
    });
};
