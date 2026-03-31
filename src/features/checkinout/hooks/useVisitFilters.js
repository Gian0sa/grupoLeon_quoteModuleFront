import { useMemo } from "react";

export function useVisitFilters({
    visits,
    selectedVendor,
    searchTerm,
    dateFrom,
    dateTo,
    statusFilter
}) {
    return useMemo(() => {
        return visits.filter(group => {
            const vendorMatch =
                selectedVendor === "all" ||
                group.vendorName === selectedVendor;

            const searchMatch =
                !searchTerm ||
                group.storeName.toLowerCase().includes(searchTerm.toLowerCase());

            return vendorMatch && searchMatch;
        });
    }, [visits, selectedVendor, searchTerm, dateFrom, dateTo, statusFilter]);
}