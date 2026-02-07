import { 
  Box, 
  Text, 
  Spinner, 
  useColorModeValue
} from "@chakra-ui/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";

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

  // ✅ Unificación por rol - MEJORADO
  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;
  
  // ✅ Extraer datos correctamente
  let resumenData = null;
  if (isVendedor && vendedorData) {
    // Si vendedorData es un array, tomar el primer elemento
    resumenData = Array.isArray(vendedorData) ? vendedorData[0] : vendedorData;
  } else if (isAdmin && adminData) {
    resumenData = Array.isArray(adminData) ? adminData[0] : adminData;
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  return (
    <Box w="100vw" minH="100vh" bg={useColorModeValue("brand.bg.light", "brand.bg.dark")}>
      {/* Header */}
      <Box 
        borderRadius="0 0 24px 24px" 
        color={useColorModeValue("brand.text.light", "brand.text.dark")} 
        position="relative"
      >
        <Box className={styles.headerMain}>
          <DashboardHeader 
            today={today} 
            exchangeRate={exchangeRateData} 
            isLoadingExchangeRate={loadingExchangeRate} 
          />
          <QuickActions />
        </Box>

        {/* Carrusel de métricas */}
        <Box p={2} pt={1} className={styles.cards}>
          {/* ✅ DEBUG: Mostrar estado de carga */}
          {isLoading && (
            <Box textAlign="center" py={4}>
              <Spinner color="teal.400" size="lg" />
              <Text mt={2} color="gray.500">Cargando datos...</Text>
            </Box>
          )}

          {/* ✅ DEBUG: Mostrar errores */}
          {error && (
            <Box textAlign="center" py={4}>
              <Text color="red.500">Error: {error.message}</Text>
            </Box>
          )}

          {/* ✅ DEBUG: Mostrar cuando no hay datos */}
          {!isLoading && !error && !resumenData && (
            <Box textAlign="center" py={4}>
              <Text color="orange.500">No hay datos disponibles</Text>
            </Box>
          )}

          {/* ✅ Mostrar carrusel solo cuando hay datos */}
          {!isLoading && !error && resumenData && (
            <Swiper
              spaceBetween={2}
              slidesPerView={2.1}
              pagination={{ clickable: true }}
              modules={[Pagination]}
              style={{ paddingBottom: "24px" }}
            >
              <SwiperSlide>
                <SalesSummary data={resumenData} />
              </SwiperSlide>

              <SwiperSlide>
                <SalesStats data={resumenData} />
              </SwiperSlide>

              <SwiperSlide>
                <Box
                  bg="gray.100"
                  border="2px"
                  borderColor="gray.400"
                  borderRadius="xl"
                  h="240px"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text color="gray.500" fontSize="sm">
                    Próximamente más métricas
                  </Text>
                </Box>
              </SwiperSlide>
            </Swiper>
          )}
        </Box>
      </Box>

      {/* Notificaciones */}
      <Box p={6}>
        {loadingNotifications ? (
          <Spinner color="teal.400" />
        ) : errorNotifications ? (
          <Text color="red.400">Error al cargar notificaciones</Text>
        ) : (
          <Notifications data={notifications} />
        )}
      </Box>
    </Box>
  );
}