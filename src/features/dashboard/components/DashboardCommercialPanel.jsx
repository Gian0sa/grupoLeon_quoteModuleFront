import React from "react";
import { Box, Grid } from "@chakra-ui/react";
import { CreditAlertsCard } from "./CreditAlertsCard";
import { TopProductsCard } from "./TopProductsCard";
import { SapSyncStatusBanner } from "./SapSyncStatusBanner";

export function DashboardCommercialPanel({
  selectedSeller,
  selectedSellerCode,
  selectedYear,
  selectedMonth,
  canFilterSellers,
}) {
  const sellerLabel = selectedSeller?.label || "";
  const sellerName = selectedSeller?.value !== 0
    ? (sellerLabel.includes(".") ? sellerLabel.split(".")[1]?.trim() : sellerLabel.trim())
    : null;

  return (
    <Box pt={6} pb={12} w="full">
      <Grid
        templateColumns={{ base: "1fr", lg: "1.3fr 1fr" }}
        gap={6}
        w="full"
        alignItems="stretch"
      >
        {/* Cada celda del grid actúa como un contenedor flex de altura fija */}
        <Box display="flex" flexDirection="column" overflow="hidden">
          <CreditAlertsCard
            selectedSeller={selectedSeller}
            canFilterSellers={canFilterSellers}
          />
        </Box>
        <Box display="flex" flexDirection="column" overflow="hidden">
          <TopProductsCard
            year={selectedYear}
            month={selectedMonth}
            sellerCode={selectedSellerCode}
            sellerName={sellerName}
            canFilterSellers={canFilterSellers}
          />
        </Box>
      </Grid>

      {/* 🛡️ Barra de Estado de Sincronización con SAP y Buffer de Alta Disponibilidad */}
      <SapSyncStatusBanner />
    </Box>
  );
}
