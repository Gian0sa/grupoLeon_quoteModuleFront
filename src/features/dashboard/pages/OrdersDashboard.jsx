import { Box, Heading, Divider, useColorModeValue } from "@chakra-ui/react";
import { format, subMonths } from "date-fns";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useQuotesSellers, useQuotesSellersAdmin } from "../hooks/queries/dashboardQueries";

import FiltersBar from "../components/OrdersDashboards/FiltersBar";
import SummaryCards from "../components/OrdersDashboards/SummaryCards";
import ChartsSection from "../components/OrdersDashboards/ChartsSection";
import OrdersTable from "../components/OrdersDashboards/OrdersTable";
import OrdersMotive from "../components/OrdersDashboards/OrdersMotive";

export default function OrdersDashboard() {
  // 🔐 Rol actual
  const { salesEmployeeCode } = useAuthStore();

  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;

  // 📅 Parámetros base
  const querySlpCode = isVendedor ? salesEmployeeCode : 0;
  const defaultMonth = format(subMonths(new Date(), 0), "MM");

  // 📊 Queries (idéntico a DashboardPage)
  const { data: vendedorData, isLoading: vendedorLoading, error: vendedorError } = useQuotesSellers(
    { slpCode: querySlpCode, month: defaultMonth },
    { enabled: isVendedor }
  );

  const { data: adminData, isLoading: adminLoading, error: adminError } = useQuotesSellersAdmin(
    { slpCode: querySlpCode, month: defaultMonth },
    { enabled: isAdmin }
  );

  // 💾 Unificación de estados
  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;
  const resumenData = isVendedor ? vendedorData?.[0] ?? null : adminData ?? null;

  console.log(resumenData);

  // 🧠 Ahora `resumenData` puedes pasarlo como prop a SummaryCards, ChartsSection, etc.
  return (
    <Box p={6} bg={useColorModeValue("gray.50", "gray.900")} minH="100vh">
      <Heading mb={4} size="lg">
        Cuadro de Avance y Gestión de Órdenes de Pedido — SAP B1
      </Heading>

      {/* <FiltersBar /> */}
      <OrdersMotive />
      <SummaryCards data={resumenData} isLoading={isLoading} error={error} />
      <ChartsSection data={resumenData} />
      <Divider mb={6} />
      <OrdersTable />
    </Box>
  );
}
