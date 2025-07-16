import { MainLayout } from "../../../components/layouts/MainLayout";
import { Grid , Box } from "@chakra-ui/react";
import SalespersonReports from "../../reports/components/SalesReport";
import { useAuthStore } from "../../auth/stores/useAuthStore";


export function DashboardPage() {
  const { salesEmployeeCode } = useAuthStore();

  const safeSalespersonId = salesEmployeeCode ?? '';

  return (
   <MainLayout>
      <Box w="100%">
        <SalespersonReports salespersonId={12} />
      </Box>
    </MainLayout>

  );
}
