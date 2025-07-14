import { MainLayout } from "../../../components/layouts/MainLayout";
import { Grid } from "@chakra-ui/react";
import SalespersonReports from "../../reports/components/SalesReport";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export function DashboardPage() {
  const { salesEmployeeCode } = useAuthStore();

  const safeSalespersonId = salesEmployeeCode ?? '';

  return (
    <MainLayout>
      <Grid
        h="100%"
        w="100%"
        templateRows="repeat(2, 1fr)"
        gap={4}
      >
        <SalespersonReports salespersonId={30} />
      </Grid>
    </MainLayout>
  );
}
