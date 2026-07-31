import { useState, useRef } from "react";
import { 
  Box, 
  Text, 
  Spinner, 
  Flex,
  SimpleGrid,
  HStack,
  IconButton,
  Skeleton,
  useColorModeValue
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import {
  useQuotesSellers,
  useQuotesSellersAdmin,
} from "../hooks/queries/dashboardQueries";
import { QUERY_KEYS } from "../../../shared/utils/queryKeys";

import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { QuickActions } from "../components/QuickActions";
import { SalesSummary } from "../components/SalesSummary";
import { SalesStats } from "../components/SalesStats";
import { SurfaceChartCard } from "../components/SurfaceChartCard";
import { DashboardCommercialPanel } from "../components/DashboardCommercialPanel";
import { DataCard } from "../components/DataCard";

export function DashboardPage() {
  const { salesEmployeeCode, username } = useAuthStore();
  const carouselRef = useRef(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.clientWidth;
    const index = Math.round(scrollLeft / (width * 0.85));
    setActiveCardIndex(Math.min(Math.max(index, 0), 2));
  };

  const scrollToCard = (index) => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.clientWidth;
    const cardWidth = width * 0.85 + 16;
    carouselRef.current.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
    setActiveCardIndex(index);
  };

  const handlePrev = () => {
    scrollToCard(Math.max(activeCardIndex - 1, 0));
  };

  const handleNext = () => {
    scrollToCard(Math.min(activeCardIndex + 1, 2));
  };

  // Roles
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;

  const querySlpCode = isVendedor ? salesEmployeeCode : 0;

  // ✅ Rango del mes actual (V3)
  const todayDate = new Date();
  const yearFrom = todayDate.getFullYear();
  const monthFrom = todayDate.getMonth() + 1;
  const monthTo = todayDate.getMonth() + 1;

  // ✅ Queries V3 actualizadas con caché persistente
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

  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;

  let resumenData = null;
  if (isVendedor && vendedorData) {
    resumenData = Array.isArray(vendedorData) ? vendedorData[0] : vendedorData;
  } else if (isAdmin && adminData) {
    resumenData = Array.isArray(adminData) ? adminData[0] : adminData;
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "MM");

  const refreshQueries = [
    [QUERY_KEYS.quotesSellers, salesEmployeeCode ?? 0, currentMonth],
    [QUERY_KEYS.quotesSellersAdmin, salesEmployeeCode ?? 0, currentMonth],
    [QUERY_KEYS.notifications],
    [QUERY_KEYS.exchangeRate, "USD", todayIso],
  ];

  return (
    <Box w="full" minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      {/* Header Integrado */}
      <TopHeaderBanner
        title={`Hola, ${username}.`}
        subtitle={today}
        showBack={false}
        showExchangeRate={true}
        refreshQueries={refreshQueries}
        pb={{ base: 5, md: 7 }}
        mb={0}
      >
        <QuickActions />
      </TopHeaderBanner>

      {/* Sección Principales Métricas */}
      <Box maxW="1200px" mx="auto" px={4} py={6}>
        {/* Si está cargando por primera vez sin datos en caché, mostrar Skeletons para evitar colapsos de layout */}
        {isLoading && !resumenData && (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
            <Skeleton h="240px" borderRadius="3xl" startColor="gray.100" endColor="gray.200" />
            <Skeleton h="240px" borderRadius="3xl" startColor="gray.100" endColor="gray.200" />
            <Skeleton h="240px" borderRadius="3xl" startColor="gray.100" endColor="gray.200" />
          </SimpleGrid>
        )}

        {error && !resumenData && (
          <Box textAlign="center" py={8}>
            <Text color="red.500">Error: {error.message}</Text>
          </Box>
        )}

        {!isLoading && !error && !resumenData && (
          <Box textAlign="center" py={8}>
            <Text color="orange.500">No hay datos disponibles</Text>
          </Box>
        )}

        {/* Si hay datos (bien frescos o desde caché local instantánea) renderizar inmediatamente */}
        {resumenData && (
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

            {/* VISTA MÓVIL (Carrusel deslizable asistido con flechas y dots) */}
            <Box display={{ base: "block", md: "none" }} position="relative" w="full">
              <Flex
                ref={carouselRef}
                onScroll={handleScroll}
                overflowX="auto"
                scrollSnapType="x mandatory"
                gap={4}
                py={2}
                px={1}
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

              {/* Flechas de navegación para móvil */}
              <IconButton
                aria-label="Anterior"
                icon={<ChevronLeftIcon w={6} h={6} />}
                position="absolute"
                left={-2}
                top="50%"
                transform="translateY(-50%)"
                zIndex={2}
                size="sm"
                borderRadius="full"
                bg="whiteAlpha.900"
                boxShadow="md"
                onClick={handlePrev}
                isDisabled={activeCardIndex === 0}
                opacity={activeCardIndex === 0 ? 0.3 : 1}
              />
              <IconButton
                aria-label="Siguiente"
                icon={<ChevronRightIcon w={6} h={6} />}
                position="absolute"
                right={-2}
                top="50%"
                transform="translateY(-50%)"
                zIndex={2}
                size="sm"
                borderRadius="full"
                bg="whiteAlpha.900"
                boxShadow="md"
                onClick={handleNext}
                isDisabled={activeCardIndex === 2}
                opacity={activeCardIndex === 2 ? 0.3 : 1}
              />

              {/* Dots indicadores de tarjeta activa */}
              <HStack justify="center" spacing={2} mt={3}>
                {[0, 1, 2].map((idx) => (
                  <Box
                    key={idx}
                    w={activeCardIndex === idx ? "20px" : "8px"}
                    h="8px"
                    borderRadius="full"
                    bg={activeCardIndex === idx ? "green.600" : "gray.300"}
                    transition="all 0.3s"
                    cursor="pointer"
                    onClick={() => scrollToCard(idx)}
                  />
                ))}
              </HStack>
            </Box>
          </>
        )}

        {/* Paneles Informativos Inferiores */}
        <DashboardCommercialPanel />
      </Box>
    </Box>
  );
}