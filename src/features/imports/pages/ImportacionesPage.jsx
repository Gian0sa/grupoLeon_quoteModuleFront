import { Box } from "@chakra-ui/react";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { Importations } from "../components/Importations";
import { usePurchaseOrdersImportacion } from "../hooks/importQueries";

export default function ImportacionesPage() {
  const {
    dataPurchaseOrdersImportacion,
    isLoadingPurchaseOrdersImportacion,
    errorPurchaseOrdersImportacion,
    refetchPurchaseOrdersImportacion,
  } = usePurchaseOrdersImportacion();

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      <TopHeaderBanner
        title="Órdenes de Importación"
        subtitle="Seguimiento y gestión de compras internacionales"
        showBack={true}
        mb={6}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        <Importations
          data={dataPurchaseOrdersImportacion}
          isLoading={isLoadingPurchaseOrdersImportacion}
          error={errorPurchaseOrdersImportacion}
          onRetry={refetchPurchaseOrdersImportacion}
        />
      </Box>
    </Box>
  );
}

