
import { MainLayout } from "../../../components/layouts/MainLayout";
import { LateralMenu } from "../components/LateralMenu";
import { Grid, GridItem } from "@chakra-ui/react";
import SalespersonReports from "../components/SalesReport";

export function DashboardPage(){
    return(
        <MainLayout>
            <LateralMenu />
            <Grid
                h='100%'
                w='100%'
                templateRows='repeat(2, 1fr)'
                gap={4}>
                <SalespersonReports salespersonId={8} />
                </Grid>
        </MainLayout>
    )
}
