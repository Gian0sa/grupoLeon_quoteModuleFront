import React from "react";
import { Box, Grid } from "@chakra-ui/react";
import { CreditAlertsCard } from "./CreditAlertsCard";
import { TopProductsCard } from "./TopProductsCard";

export function DashboardCommercialPanel() {
  return (
    <Box pt={6} pb={12} w="full">
      <Grid
        templateColumns={{ base: "1fr", lg: "1.3fr 1fr" }}
        gridAutoRows={{ base: "auto", lg: "530px" }}
        gap={6}
        w="full"
      >
        {/* Cada celda del grid actúa como un contenedor flex de altura fija */}
        <Box display="flex" flexDirection="column" overflow="hidden">
          <CreditAlertsCard />
        </Box>
        <Box display="flex" flexDirection="column" overflow="hidden">
          <TopProductsCard />
        </Box>
      </Grid>
    </Box>
  );
}
