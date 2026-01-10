import { Container, VStack, Flex, Box, Heading } from "@chakra-ui/react";
import { BackButton } from "../../../components/BackButton";
import { Importations } from "../components/Importations";
import { usePurchaseOrdersImportacion } from "../hooks/importQueries";

export default function ImportacionesPage() {
  const {
    dataPurchaseOrdersImportacion,
    isLoadingPurchaseOrdersImportacion,
    errorPurchaseOrdersImportacion,
    refetchPurchaseOrdersImportacion,
  } = usePurchaseOrdersImportacion();

  console.log(dataPurchaseOrdersImportacion);

  return (
    <Container maxW="container.xl" py={{ base: 6, md: 10 }}>
      <VStack
        bg="green.50"
        p={{ base: 4, md: 8 }}
        borderRadius="2xl"
        spacing={8}
        boxShadow="xl"
      >
        <Flex
          bg="green.700"
          color="white"
          align="center"
          justify="center"
          w="100%"
          p={4}
          borderRadius="xl"
          position="relative"
        >
          <Box position="absolute" left={4}>
            <BackButton color="white" />
          </Box>

          <Heading size={{ base: "md", md: "lg" }}>
            Órdenes de Importación
          </Heading>
        </Flex>

        <Box w="100%" bg="white" p={{ base: 4, md: 6 }} borderRadius="xl">
          <Importations
            data={dataPurchaseOrdersImportacion}
            isLoading={isLoadingPurchaseOrdersImportacion}
            error={errorPurchaseOrdersImportacion}
            onRetry={refetchPurchaseOrdersImportacion}
          />
        </Box>
      </VStack>
    </Container>
  );
}

