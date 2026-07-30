import { 
  Box, 
  Text, 
  Spinner, 
  Flex,
  SimpleGrid,
  useColorModeValue
} from "@chakra-ui/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import styles from "./DashboardPage.module.css";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { 
  useQuotesSellers, 
  useQuotesSellersAdmin, 
  useNotifications, 
  useExchangeRate 
} from "../hooks/queries/dashboardQueries";

import { DashboardHeader } from "../components/DashboardHeader";
import { QuickActions } from "../components/QuickActions";
import { SalesSummary } from "../components/SalesSummary";
import { SalesStats } from "../components/SalesStats";
import { SurfaceChartCard } from "../components/SurfaceChartCard";
import { Notifications } from "../components/Notifications";
import { DataCard } from "../components/DataCard";

export function DashboardPage() {
  const { salesEmployeeCode } = useAuthStore();

  // Roles
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;

  const querySlpCode = isVendedor ? salesEmployeeCode : 0;

  // ✅ Rango del mes actual (V3)
  const todayDate = new Date();
  const yearFrom = todayDate.getFullYear();
  const monthFrom = todayDate.getMonth() + 1;
  const monthTo = todayDate.getMonth() + 1;

  // ✅ Queries V3 actualizadas
  const {
    data: vendedorData, 
    isLoading: vendedorLoading, 
    error: vendedorError 
  } = useQuotesSellers(
    { 
      slpCode: querySlpCode, 
      yearFrom, 
      monthFrom, 
      monthTo 
    }, 
    { enabled: isVendedor }
  );

  const { 
    data: adminData, 
    isLoading: adminLoading, 
    error: adminError 
  } = useQuotesSellersAdmin(
    { 
      slpCode: querySlpCode, 
      yearFrom, 
      monthFrom, 
      monthTo 
    }, 
    { enabled: isAdmin }
  );

  // ✅ DEBUG: Ver qué datos llegan
  console.log("vendedorData completo:", vendedorData);
  console.log("adminData completo:", adminData);
  console.log("isVendedor:", isVendedor);
  console.log("isAdmin:", isAdmin);

  const { 
    data: notifications, 
    isLoading: loadingNotifications, 
    error: errorNotifications 
  } = useNotifications();

  const { 
    data: exchangeRateData,
    isLoading: loadingExchangeRate 
  } = useExchangeRate({ 
    currency: 'USD', 
    date: format(new Date(), 'yyyy-MM-dd') 
  });

  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;

  let resumenData = null;
  if (isVendedor && vendedorData) {
    resumenData = Array.isArray(vendedorData) ? vendedorData[0] : vendedorData;
  } else if (isAdmin && adminData) {
    resumenData = Array.isArray(adminData) ? adminData[0] : adminData;
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  return (
    <Box w="full" minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      {/* Header Integrado */}
      <Box className={styles.headerMain} color="white">
        <DashboardHeader 
          today={today} 
          exchangeRate={exchangeRateData} 
          isLoadingExchangeRate={loadingExchangeRate} 
        />
        <QuickActions />
      </Box>

      {/* Sección Principales Métricas */}
      <Box maxW="1200px" mx="auto" px={4} py={6}>
        {isLoading && (
          <Box textAlign="center" py={8}>
            <Spinner color="green.500" size="lg" />
            <Text mt={2} color="gray.500">Cargando datos...</Text>
          </Box>
        )}

        {error && (
          <Box textAlign="center" py={8}>
            <Text color="red.500">Error: {error.message}</Text>
          </Box>
        )}

        {!isLoading && !error && !resumenData && (
          <Box textAlign="center" py={8}>
            <Text color="orange.500">No hay datos disponibles</Text>
          </Box>
        )}

        {!isLoading && !error && resumenData && (
          <>
            {/* VISTA PC (Grid 3 columnas) */}
            <SimpleGrid 
              columns={{ base: 1, md: 3 }} 
              spacing={6} 
              display={{ base: "none", md: "grid" }}
            >
              <SalesSummary data={resumenData} />
              <SalesStats data={resumenData} />
              <SurfaceChartCard data={resumenData} />
            </SimpleGrid>

            {/* VISTA MÓVIL (Carrusel deslizable nativo) */}
            <Flex
              display={{ base: "flex", md: "none" }}
              overflowX="auto"
              scrollSnapType="x mandatory"
              gap={4}
              py={2}
              sx={{
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
                "-ms-overflow-style": "none",
              }}
            >
              <Box flexShrink={0} w="85vw" scrollSnapAlign="center">
                <SalesSummary data={resumenData} />
              </Box>
              <Box flexShrink={0} w="85vw" scrollSnapAlign="center">
                <SalesStats data={resumenData} />
              </Box>
              <Box flexShrink={0} w="85vw" scrollSnapAlign="center">
                <SurfaceChartCard data={resumenData} />
              </Box>
            </Flex>
          </>
        )}
      </Box>

      {/* Notificaciones */}
      <Box maxW="1200px" mx="auto" px={4} pb={12}>
        {loadingNotifications ? (
          <Spinner color="green.500" />
        ) : errorNotifications ? (
          <Text color="red.400">Error al cargar notificaciones</Text>
        ) : (
          <Notifications data={notifications} />
        )}
      </Box>
    </Box>
  );
}