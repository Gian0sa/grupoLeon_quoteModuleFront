import { MainLayout } from "../../../components/layouts/MainLayout";
import { Grid , Box } from "@chakra-ui/react";
import SalespersonReports from "../../reports/components/SalesReport";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { ReportPage } from "../../reports/pages/ReportPage";

export function DashboardPage() {
  const { salesEmployeeCode } = useAuthStore();

  const safeSalespersonId = salesEmployeeCode ?? "";

  return (
    <MainLayout>
      <Box w="100%">
        <ReportPage salespersonId={safeSalespersonId} />
      </Box>
    </MainLayout>
  );
}
