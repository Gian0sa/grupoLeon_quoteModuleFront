
import { MainLayout } from "../../../components/layouts/MainLayout";
import { LateralMenu } from "../components/LateralMenu";
import { TopProducts } from "../components/TopProducts";
import { Promotions } from "../components/Promotions";
import { Grid, GridItem } from "@chakra-ui/react";

export function DashboardPage(){
    return(
        <MainLayout>
            <LateralMenu />
            <Grid
                h='100%'
                w='100%'
                templateRows='repeat(2, 1fr)'
                gap={4}
                >
                    {/* <GridItem colSpan={2} bg='tomato' >
                        <TopProducts />
                    </GridItem> */}
                {/* <GridItem colSpan={2} bg='tomato' >
                    <Promotions />
                </GridItem> */}
                </Grid>
        </MainLayout>
    )
}
