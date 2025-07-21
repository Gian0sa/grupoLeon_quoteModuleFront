import SalespersonReports from "../components/SalesReport";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { Grid , Box } from "@chakra-ui/react";
import { useAuthStore } from "../../auth/stores/useAuthStore";



export function ReportPage({salespersonId}){
  
  const { salesEmployeeCode} = useAuthStore(); 

    return(
      <Box w="100%">
        <SalespersonReports salespersonId={salesEmployeeCode} />
      </Box>   
    )
}