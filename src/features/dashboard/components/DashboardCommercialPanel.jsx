import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import { CreditAlertsCard } from "./CreditAlertsCard";
import { TopProductsCard } from "./TopProductsCard";

export function DashboardCommercialPanel() {
  return (
    <Box pt={6} pb={12} w="full">
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
        <CreditAlertsCard />
        <TopProductsCard />
      </SimpleGrid>
    </Box>
  );
}
