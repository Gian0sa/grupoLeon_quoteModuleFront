import {
  Box,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
  HStack,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { Importations } from "../components/Importations";
import { BackOrderDemandSection } from "../components/BackOrderDemandSection";
import { usePurchaseOrdersImportacion, useBackOrderDemands } from "../hooks/importQueries";
import { useIsAdmin } from "../../../shared/utils/permissions";
import { GiCargoShip } from "react-icons/gi";
import { Package } from "lucide-react";

export default function ImportacionesPage() {
  const isAdmin = useIsAdmin();
  const {
    dataPurchaseOrdersImportacion,
    isLoadingPurchaseOrdersImportacion,
    errorPurchaseOrdersImportacion,
    refetchPurchaseOrdersImportacion,
  } = usePurchaseOrdersImportacion();

  const { backOrdersData } = useBackOrderDemands();
  const backOrderCount = backOrdersData?.summary?.totalBackOrders || 0;

  const tabBg = useColorModeValue("white", "gray.800");
  const tabBorder = useColorModeValue("gray.200", "gray.700");

  return (
    <Box w="full" minH="100vh" bg={useColorModeValue("gray.50", "gray.900")} pb="120px">
      <TopHeaderBanner
        title="Órdenes de Importación"
        subtitle="Seguimiento de compras internacionales y demanda comercial sin stock"
        showBack={true}
        mb={4}
      />

      <Box maxW="1280px" mx="auto" px={{ base: 4, md: 6 }}>
        <Tabs variant="enclosed" colorScheme="blue" isLazy>
          <TabList mb={6} borderBottom="2px solid" borderColor={tabBorder}>
            <Tab
              fontWeight="bold"
              fontSize={{ base: "xs", md: "sm" }}
              _selected={{
                color: "blue.600",
                bg: tabBg,
                borderColor: tabBorder,
                borderBottomColor: tabBg,
              }}
            >
              <HStack spacing={2}>
                <Icon as={GiCargoShip} boxSize={4} />
                <span>Órdenes de Importación SAP</span>
              </HStack>
            </Tab>

            {isAdmin && (
              <Tab
                fontWeight="bold"
                fontSize={{ base: "xs", md: "sm" }}
                _selected={{
                  color: "red.600",
                  bg: tabBg,
                  borderColor: tabBorder,
                  borderBottomColor: tabBg,
                }}
              >
                <HStack spacing={2}>
                  <Icon as={Package} boxSize={4} />
                  <span>Demanda Back Order (Sin Stock)</span>
                  {backOrderCount > 0 && (
                    <Badge colorScheme="red" variant="solid" borderRadius="full" px={2} fontSize="10px">
                      {backOrderCount}
                    </Badge>
                  )}
                </HStack>
              </Tab>
            )}
          </TabList>

          <TabPanels>
            {/* Panel 1: Órdenes de Importación SAP */}
            <TabPanel p={0}>
              <Importations
                data={dataPurchaseOrdersImportacion}
                isLoading={isLoadingPurchaseOrdersImportacion}
                error={errorPurchaseOrdersImportacion}
                onRetry={refetchPurchaseOrdersImportacion}
              />
            </TabPanel>

            {/* Panel 2: Demanda Back Order de Cotizaciones por Vendedor (Solo Administradores) */}
            {isAdmin && (
              <TabPanel p={0}>
                <BackOrderDemandSection />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}


