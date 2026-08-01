import { useState, useRef } from "react";
import { 
  Box, 
  Text, 
  Flex,
  SimpleGrid,
  HStack,
  VStack,
  IconButton,
  Skeleton,
  useColorModeValue,
  Select,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, RotateCcw, UserCheck } from "lucide-react";

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
import SellerSelect from "../../../components/SellerSelect";

const MONTHS_LIST = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export function DashboardPage() {
  const { salesEmployeeCode, username } = useAuthStore();
  const carouselRef = useRef(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Roles
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;

  // Rango y Filtros Dinámicos
  const todayDate = new Date();
  const currentRealYear = todayDate.getFullYear();
  const currentRealMonth = todayDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentRealYear);
  const [selectedMonth, setSelectedMonth] = useState(currentRealMonth);
  const [selectedSellerCode, setSelectedSellerCode] = useState(isVendedor ? salesEmployeeCode : 0);
  const [selectedSellerOption, setSelectedSellerOption] = useState({ value: 0, label: "Todos los vendedores" });

  const querySlpCode = isVendedor ? salesEmployeeCode : (selectedSellerCode || 0);

  const yearFrom = selectedYear;
  const monthFrom = selectedMonth;
  const monthTo = selectedMonth;

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

  const handleSelectPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleSelectCurrentMonth = () => {
    setSelectedMonth(currentRealMonth);
    setSelectedYear(currentRealYear);
  };

  const isCurrentMonthView = selectedYear === currentRealYear && selectedMonth === currentRealMonth;

  // ✅ Queries V3 enviando siempre consulta directa y fresca por usuario
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

  // Comprobar inicio de mes en cero
  const isStartOfMonthZero = isCurrentMonthView && resumenData && 
    Number(resumenData.AVANCE_MES_USD || 0) === 0 && 
    Number(resumenData.PEDIDOS_MES_USD || 0) === 0;

  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });
  const todayIso = format(new Date(), "yyyy-MM-dd");

  const refreshQueries = [
    [QUERY_KEYS.quotesSellers, querySlpCode, yearFrom, monthFrom, monthTo],
    [QUERY_KEYS.quotesSellersAdmin, querySlpCode, yearFrom, monthFrom, monthTo],
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
        {/* Barra Superior de Filtros y Selección de Período Comercial */}
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
          bg="white"
          p={4}
          borderRadius="2xl"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.100"
          mb={6}
          gap={3}
        >
          {/* Título de Rango e Indicador */}
          <HStack spacing={3}>
            <Box p={2.5} borderRadius="xl" bg="green.50" color="green.700">
              <Calendar size={20} />
            </Box>
            <VStack align="start" spacing={0}>
              <HStack spacing={2}>
                <Text fontWeight="800" fontSize="sm" color="gray.800">
                  Período Comercial
                </Text>
                <Badge colorScheme={isCurrentMonthView ? "green" : "blue"} borderRadius="full" px={2.5} py={0.5} fontSize="xs">
                  {isCurrentMonthView ? "Mes Actual" : `${MONTHS_LIST.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.500">
                Resumen de facturación, pedidos y meta por vendedor
              </Text>
            </VStack>
          </HStack>

          {/* Controles de Selección */}
          <Flex direction={{ base: "column", sm: "row" }} gap={2} align="center" w={{ base: "full", md: "auto" }}>
            {/* Botones de Acceso Rápido */}
            <HStack spacing={1.5} w={{ base: "full", sm: "auto" }}>
              <Button
                size="xs"
                h="36px"
                px={3}
                fontSize="xs"
                fontWeight="700"
                variant={isCurrentMonthView ? "solid" : "outline"}
                colorScheme="green"
                borderRadius="xl"
                onClick={handleSelectCurrentMonth}
              >
                Mes Actual
              </Button>
              <Button
                size="xs"
                h="36px"
                px={3}
                fontSize="xs"
                fontWeight="700"
                variant={!isCurrentMonthView ? "solid" : "outline"}
                colorScheme="blue"
                borderRadius="xl"
                leftIcon={<RotateCcw size={14} />}
                onClick={handleSelectPrevMonth}
              >
                Mes Anterior
              </Button>
            </HStack>

            {/* Selectores de Mes y Año */}
            <HStack spacing={1.5} w={{ base: "full", sm: "auto" }}>
              <Select
                size="sm"
                h="36px"
                borderRadius="xl"
                bg="gray.50"
                borderColor="gray.200"
                fontSize="xs"
                fontWeight="600"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                w="120px"
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                h="36px"
                borderRadius="xl"
                bg="gray.50"
                borderColor="gray.200"
                fontSize="xs"
                fontWeight="600"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                w="90px"
              >
                {[currentRealYear, currentRealYear - 1, currentRealYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </HStack>

            {/* Selector de Vendedor (Solo para Administradores) */}
            {isAdmin && (
              <Box minW={{ base: "full", sm: "210px" }} w={{ base: "full", sm: "210px" }}>
                <SellerSelect
                  selectedSeller={selectedSellerOption}
                  setSelectedSeller={(sel) => {
                    setSelectedSellerOption(sel);
                    setSelectedSellerCode(sel ? sel.value : 0);
                  }}
                  setValue={() => {}}
                  hideLabel={true}
                  size="sm"
                  placeholder="Filtrar por Vendedor"
                />
              </Box>
            )}
          </Flex>
        </Flex>

        {/* Banner Informativo si el inicio del mes está en $0.00 */}
        {isStartOfMonthZero && (
          <Alert status="info" borderRadius="2xl" mb={6} border="1px solid" borderColor="blue.200" bg="blue.50">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontSize="sm" fontWeight="800" color="blue.900">
                ¡Inicio de Mes {MONTHS_LIST.find(m => m.value === currentRealMonth)?.label}!
              </AlertTitle>
              <AlertDescription display="block" fontSize="xs" color="blue.700" mt={0.5}>
                Aún no se registran facturas ni pedidos en el mes en curso. Puedes consultar la actividad y cumplimiento del mes anterior con un clic.
              </AlertDescription>
            </Box>
            <Button
              size="xs"
              colorScheme="blue"
              borderRadius="xl"
              fontWeight="700"
              leftIcon={<RotateCcw size={13} />}
              onClick={handleSelectPrevMonth}
            >
              Ver Mes Anterior
            </Button>
          </Alert>
        )}

        {/* Durante la carga directa de datos del usuario, mostrar Skeletons limpios */}
        {isLoading && (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
            <Skeleton h="240px" borderRadius="3xl" startColor="gray.100" endColor="gray.200" />
            <Skeleton h="240px" borderRadius="3xl" startColor="gray.100" endColor="gray.200" />
            <Skeleton h="240px" borderRadius="3xl" startColor="gray.100" endColor="gray.200" />
          </SimpleGrid>
        )}

        {error && !isLoading && (
          <Box textAlign="center" py={8}>
            <Text color="red.500">Error al consultar datos: {error.message}</Text>
          </Box>
        )}

        {!isLoading && !error && !resumenData && (
          <Box textAlign="center" py={8}>
            <Text color="orange.500">No hay datos disponibles para este usuario</Text>
          </Box>
        )}

        {/* Cuando los datos frescos del usuario actual estén disponibles */}
        {!isLoading && resumenData && (
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
                  msOverflowStyle: "none",
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