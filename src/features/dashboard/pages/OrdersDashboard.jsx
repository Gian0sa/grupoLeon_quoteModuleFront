import { Box, Heading, Divider, useColorModeValue } from "@chakra-ui/react";
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import {
  useQuotesSellers,
  useQuotesSellersAdmin,
  useDashboardMotives,
  useOrdersCancelated
} from "../hooks/queries/dashboardQueries";

import FiltersBar from "../components/OrdersDashboards/FiltersBar";
import SummaryCards from "../components/OrdersDashboards/SummaryCards";
import ChartsSection from "../components/OrdersDashboards/ChartsSection";
import OrdersMotive from "../components/OrdersDashboards/OrdersMotive";
import OrdersCancelatedTable from "../components/OrdersDashboards/OrdersCancelatedTable";

export default function OrdersDashboard() {
  // 🔐 Rol actual
  const { salesEmployeeCode } = useAuthStore();

  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;

  // 📅 Parámetros base
  const querySlpCode = isVendedor ? salesEmployeeCode : 0;
  const currentYear = new Date().getFullYear();
  const defaultMonth = format(subMonths(new Date(), 0), "MM");

  const [filters, setFilters] = useState({
    yearFrom: currentYear,
    monthFrom: 1,
    monthTo: 12,
    sellerCode: querySlpCode,
  });

  // 📊 Queries (idéntico a DashboardPage)
  const {
    data: vendedorData,
    isLoading: vendedorLoading,
    error: vendedorError
  } = useQuotesSellers({ slpCode: querySlpCode, month: defaultMonth }, { enabled: isVendedor });

  const {
    data: adminData,
    isLoading: adminLoading,
    error: adminError
  } = useQuotesSellersAdmin({ slpCode: querySlpCode, month: defaultMonth }, { enabled: isAdmin });

  // 📊 Motivos de cancelación (Dashboard Motives) - USA filters pero forzando sellerCode si es vendedor
  const {
    data: ordersMotive,
    isLoading: motivesLoading,
    error: motivesError
  } = useDashboardMotives({
    yearFrom: filters.yearFrom,
    monthFrom: filters.monthFrom,
    monthTo: filters.monthTo,
    slpCode: isVendedor ? salesEmployeeCode : filters.sellerCode 
  });

  // 🛑 Órdenes canceladas - usa los mismos filtros
  const {
    data: cancelledOrders,
    isLoading: ordersCancelatedLoading,
    error: ordersCancelatedError
  } = useOrdersCancelated({
    yearFrom: filters.yearFrom,
    monthFrom: filters.monthFrom,
    monthTo: filters.monthTo,
    slpCode: isVendedor ? salesEmployeeCode : filters.sellerCode
  });

  console.log("el canceled orders es : ",cancelledOrders);

  // 💾 Unificación de estados
  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;
  const resumenData = isVendedor ? vendedorData?.[0] ?? null : adminData ?? null;

  console.log("Resumen:", resumenData);
  console.log("Motivos:", ordersMotive);
  console.log("Filters aplicados:", filters);

  // Handler para cuando se apliquen los filtros
  const handleApplyFilters = (newFilters) => {
    console.log("Nuevos filtros:", newFilters);
    
    // Si es vendedor, forzar su código (no permitir cambio)
    if (isVendedor) {
      setFilters({
        ...newFilters,
        sellerCode: salesEmployeeCode
      });
    } else {
      setFilters(newFilters);
    }
  };

  return (
    <Box p={6} bg={useColorModeValue("gray.50", "gray.900")} minH="100vh">
      <Heading mb={4} size="lg">
        Cuadro de Avance y Gestión de Órdenes de Pedido — SAP B1
      </Heading>

      <FiltersBar 
        initialFilters={filters} 
        onApply={handleApplyFilters}
        hideSellerField={isVendedor} // Ocultar el selector si es vendedor
      />
      <OrdersMotive
        ordersMotive={ordersMotive}
        isLoading={motivesLoading}
        isError={motivesError}
      />
      <SummaryCards data={resumenData} isLoading={isLoading} error={error} />
      <ChartsSection data={resumenData} />
      <OrdersCancelatedTable
        data={cancelledOrders}
        isLoading={ordersCancelatedLoading}
        isError={ordersCancelatedError}
      />

    </Box>
  );
}