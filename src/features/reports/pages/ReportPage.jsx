import SalespersonReports from "../components/SalesReport";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Grid , Box } from "@chakra-ui/react";

export function ReportPage({salespersonId}){
    return(
      <Box w="100%">
        <SalespersonReports salespersonId={salespersonId} />
      </Box>   
    )
}