import { 
  Box, 
  Text, 
  Spinner, 
  useColorModeValue, 
  useColorMode 
} from "@chakra-ui/react";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";

import styles from "./DashboardPage.module.css";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useQuotesSellers, useQuotesSellersAdmin, useNotifications , useExchangeRate } from "../hooks/queries/dashboardQueries";

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
  const defaultMonth = format(subMonths(new Date(), 0), "MM");

  // Queries
  const { data: vendedorData, isLoading: vendedorLoading, error: vendedorError } = useQuotesSellers(
    { slpCode: querySlpCode, month: defaultMonth }, 
    { enabled: isVendedor }
  );

  const { data: adminData, isLoading: adminLoading, error: adminError } = useQuotesSellersAdmin(
    { slpCode: querySlpCode, month: defaultMonth }, 
    { enabled: isAdmin }
  );

  const { data: notifications, isLoading: loadingNotifications, error: errorNotifications } = useNotifications();

  const { data: exchangeRateData , isLoading: loadingExchangeRate , error : errorExchangeRate } = useExchangeRate({ currency: 'USD', date: format(new Date(), 'yyyy-MM-dd') });


  // Estado según rol
  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;
  const resumenData = isVendedor ? vendedorData?.[0] ?? null : adminData ?? null;

  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  return (
    <Box w="100vw" minH="100vh">
      {/* Header */}
      <Box borderRadius="0 0 24px 24px" color="white" position="relative">
        <Box className={styles.headerMain}>
          <DashboardHeader today={today} exchangeRate={exchangeRateData } />
          <QuickActions />
        </Box>

        {/* Métricas con carrusel */}
        <Box p={2} pt={1} className={styles.cards}>
          <Swiper
            spaceBetween={2}
            slidesPerView={2.1}
            pagination={{ clickable: true }}
            modules={[Pagination]}
            style={{ paddingBottom: "24px" }}
          >
            <SwiperSlide>
              <DataCard
                isLoading={isLoading}
                error={error}
                data={resumenData}
                render={(d) => <SalesSummary data={d} />}
              />
            </SwiperSlide>

            <SwiperSlide>
              <DataCard
                isLoading={isLoading}
                error={error}
                data={resumenData}
                render={(d) => <SalesStats data={d} />}
              />
            </SwiperSlide>

            {/* Placeholder para futuras métricas */}
            <SwiperSlide>
              <Box
                bg="gray.100"
                border="2px"
                borderColor="gray.400"
                borderRadius="xl"
                h="230px"
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
