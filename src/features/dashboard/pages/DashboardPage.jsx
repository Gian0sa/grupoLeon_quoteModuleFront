import { useState, useRef } from "react";
import { 
  Box, 
  Text, 
  Flex,
  Grid,
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
  Progress,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, RotateCcw, UserCheck } from "lucide-react";

import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useHasAccess } from "../../../shared/utils/permissions";
import { useIsFetching } from "@tanstack/react-query";
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

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Calcula los últimos N meses desde hoy (incluyendo el actual)
function getLastNMonths(n = 3) {
  const today = new Date();
  const result = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return result;
}

export function DashboardPage() {
  const { salesEmployeeCode, username } = useAuthStore();
  const carouselRef = useRef(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const hasAccess = useHasAccess();
  // Roles y Permisos Granulares
  const isVendedor = !!(salesEmployeeCode && Number(salesEmployeeCode) > 0);
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0 || salesEmployeeCode === "0" || salesEmployeeCode === "null";
  const canFilterSellers =
    isAdmin ||
    hasAccess("GET /sellers") ||
    hasAccess("GET /AdminQuotesSellers/:slpCode/:month") ||
    hasAccess("GET:/sellers") ||
    hasAccess("GET:/AdminQuotesSellers/:slpCode/:month");
  const canViewCommercialPeriod = isAdmin || hasAccess("GET /AdminQuotesSellers/:slpCode/:month") || canFilterSellers;

  // 🗓️ Años dinámicos que CONTIENEN datos reales en SAP (2024 excluido por no tener registros)
  const currentRealYear = new Date().getFullYear();
  const currentRealMonth = new Date().getMonth() + 1;
  const AVAILABLE_YEARS = [currentRealYear, 2025]; // 2024 no se muestra al no tener registros en SAP

  // Estado para Vendedor (Últimos 3 Meses)
  const last3Months = getLastNMonths(3);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);

  // Estado para Administrador / Supervisores — Selección explícita de Mes y Año con datos
  const [adminYear, setAdminYear] = useState(currentRealYear);
  const [adminMonth, setAdminMonth] = useState(currentRealMonth);

  // Ocultar meses futuros en el año en curso (ej. de Septiembre a Diciembre en 2026)
  const maxMonthForAdminYear = adminYear === currentRealYear ? currentRealMonth : 12;
  const availableAdminMonths = MONTH_NAMES.slice(0, maxMonthForAdminYear);

  const handleAdminYearChange = (newYear) => {
    setAdminYear(newYear);
    if (newYear === currentRealYear && adminMonth > currentRealMonth) {
      setAdminMonth(currentRealMonth);
    }
  };

  // Derivar año y mes según rol y permisos
  const selectedPeriod = last3Months[selectedPeriodIdx] || last3Months[0];
  const selectedYear  = canViewCommercialPeriod ? adminYear : selectedPeriod.year;
  const selectedMonth = canViewCommercialPeriod ? adminMonth : selectedPeriod.month;

  // ⚠️ Siempre monthFrom === monthTo para evitar descuadres con SAP
  const yearFrom  = selectedYear;
  const monthFrom = selectedMonth;
  const monthTo   = selectedMonth;

  const [selectedSellerCode, setSelectedSellerCode] = useState(isVendedor && !canFilterSellers ? salesEmployeeCode : 0);
  const [selectedSellerOption, setSelectedSellerOption] = useState({ value: 0, label: "Todos los vendedores" });

  const querySlpCode = canFilterSellers ? (selectedSellerCode || 0) : (salesEmployeeCode || 0);

  const isCurrentMonthView = selectedYear === currentRealYear && selectedMonth === currentRealMonth;

  const handleSelectCurrentMonth = () => {
    if (canViewCommercialPeriod) {
      setAdminYear(currentRealYear);
      setAdminMonth(currentRealMonth);
    } else {
      setSelectedPeriodIdx(0);
    }
  };

  const handleSelectPrevMonth = () => {
    if (canViewCommercialPeriod) {
      if (adminMonth === 1) {
        const prevYear = adminYear - 1;
        if (AVAILABLE_YEARS.includes(prevYear)) {
          setAdminYear(prevYear);
          setAdminMonth(12);
        } else {
          setAdminMonth(1);
        }
      } else {
        setAdminMonth((m) => m - 1);
      }
    } else {
      setSelectedPeriodIdx((i) => Math.min(i + 1, last3Months.length - 1));
    }
  };

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

  const handlePrev = () => scrollToCard(Math.max(activeCardIndex - 1, 0));
  const handleNext = () => scrollToCard(Math.min(activeCardIndex + 1, 2));

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
    { enabled: !canFilterSellers }
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
    { enabled: canFilterSellers }
  );

  const isLoading = canFilterSellers ? adminLoading : vendedorLoading;
  const error = canFilterSellers ? adminError : vendedorError;

  let resumenData = null;
  if (!canFilterSellers && vendedorData) {
    resumenData = Array.isArray(vendedorData) ? vendedorData[0] : vendedorData;
  } else if (canFilterSellers && adminData) {
    resumenData = Array.isArray(adminData) ? adminData[0] : adminData;
  }

  // Preservar el nombre real del vendedor si SAP devuelve "Sin datos" (ej. vendedor nuevo en mes anterior)
  if (resumenData && resumenData.VENDEDOR === "Sin datos") {
    const fallbackName = !canFilterSellers 
      ? username 
      : (selectedSellerOption && selectedSellerOption.value !== 0 ? selectedSellerOption.label : null);
    if (fallbackName) {
      resumenData = { ...resumenData, VENDEDOR: fallbackName };
    }
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
    ['topProducts'],
    ['promotions'],
    ['history'],
    ['dashboardMotives'],
    ['ordersCancelated'],
    ['topCanceledProducts'],
    ['topSelledProducts'],
    ['accountsReceivable'],
    [QUERY_KEYS.notifications],
    [QUERY_KEYS.exchangeRate, "USD", todayIso],
  ];

  const pageBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box w="full" minH="100vh" bg={pageBg} position="relative" overflowX="hidden">
      {/* Indicador de carga superior sutil y no invasivo */}
      {isLoading && (
        <Progress
          size="xs"
          isIndeterminate
          colorScheme="green"
          position="fixed"
          top={0}
          left={0}
          right={0}
          zIndex={9999}
          bg="transparent"
        />
      )}

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
      <Box maxW="1200px" mx="auto" px={{ base: 2.5, sm: 3.5, md: 4 }} py={{ base: 4, md: 6 }}>
        {/* Barra Superior de Filtros y Selección de Período Comercial (Concedido por Permisos o Admin) */}
        {canViewCommercialPeriod && (
          <Box
            bg="white"
            p={{ base: 3, sm: 3.5, md: 4 }}
            borderRadius="2xl"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.100"
            mb={6}
            w="full"
          >
            {/* VISTA DESKTOP (lg y superior: todo en 1 fila elegante) */}
            <Flex
              display={{ base: "none", lg: "flex" }}
              justify="space-between"
              align="center"
              gap={3}
              w="full"
            >
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
                      {isCurrentMonthView ? "Mes Actual" : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    Resumen de facturación, pedidos y meta por vendedor
                  </Text>
                </VStack>
              </HStack>

              <HStack spacing={2}>
                <HStack spacing={1.5}>
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

                <HStack spacing={1.5}>
                  <Select
                    size="sm"
                    h="36px"
                    borderRadius="xl"
                    bg="gray.50"
                    borderColor="gray.200"
                    fontSize="xs"
                    fontWeight="600"
                    value={adminMonth}
                    onChange={(e) => setAdminMonth(Number(e.target.value))}
                    w="120px"
                  >
                    {availableAdminMonths.map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
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
                    value={adminYear}
                    onChange={(e) => handleAdminYearChange(Number(e.target.value))}
                    w="95px"
                  >
                    {AVAILABLE_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </Select>
                </HStack>

                {canFilterSellers && (
                  <Box w="210px">
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
              </HStack>
            </Flex>

            {/* VISTA MÓVIL Y TABLET (base a md: orden vertical sin desbordamiento) */}
            <VStack
              display={{ base: "flex", lg: "none" }}
              spacing={2.5}
              align="stretch"
              w="full"
            >
              {/* Encabezado: Título + Badge */}
              <Flex justify="space-between" align="center" gap={2}>
                <HStack spacing={2}>
                  <Box p={1.5} borderRadius="lg" bg="green.50" color="green.700">
                    <Calendar size={16} />
                  </Box>
                  <Text fontWeight="800" fontSize="xs" color="gray.800">
                    Período Comercial
                  </Text>
                </HStack>
                <Badge colorScheme={isCurrentMonthView ? "green" : "blue"} borderRadius="full" px={2} py={0.5} fontSize="10px" fontWeight="800">
                  {isCurrentMonthView ? "Mes Actual" : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                </Badge>
              </Flex>

              {/* Fila 1: Botones Mes Actual / Mes Anterior (50% cada uno) */}
              <Grid templateColumns="repeat(2, 1fr)" gap={2} w="full">
                <Button
                  size="xs"
                  h="34px"
                  fontSize="11px"
                  fontWeight="700"
                  variant={isCurrentMonthView ? "solid" : "outline"}
                  colorScheme="green"
                  borderRadius="lg"
                  onClick={handleSelectCurrentMonth}
                >
                  Mes Actual
                </Button>
                <Button
                  size="xs"
                  h="34px"
                  fontSize="11px"
                  fontWeight="700"
                  variant={!isCurrentMonthView ? "solid" : "outline"}
                  colorScheme="blue"
                  borderRadius="lg"
                  leftIcon={<RotateCcw size={12} />}
                  onClick={handleSelectPrevMonth}
                >
                  Mes Anterior
                </Button>
              </Grid>

              {/* Fila 2: Selectores de Mes y Año en móvil */}
              <Grid templateColumns="1.3fr 1fr" gap={2} w="full">
                <Select
                  size="sm"
                  h="34px"
                  borderRadius="lg"
                  bg="gray.50"
                  borderColor="gray.200"
                  fontSize="11px"
                  fontWeight="600"
                  value={adminMonth}
                  onChange={(e) => setAdminMonth(Number(e.target.value))}
                >
                  {availableAdminMonths.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  h="34px"
                  borderRadius="lg"
                  bg="gray.50"
                  borderColor="gray.200"
                  fontSize="11px"
                  fontWeight="600"
                  value={adminYear}
                  onChange={(e) => handleAdminYearChange(Number(e.target.value))}
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </Grid>

              {/* Fila 3: Selector de Vendedor (100% de ancho en móvil) */}
              {canFilterSellers && (
                <Box w="full">
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
            </VStack>
          </Box>
        )}

        {/* Banner Informativo si el inicio del mes está en $0.00 */}
        {isStartOfMonthZero && (
          <Alert status="info" borderRadius="2xl" mb={6} border="1px solid" borderColor="blue.200" bg="blue.50">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontSize="sm" fontWeight="800" color="blue.900">
                ¡Inicio de Mes {MONTH_NAMES[(new Date().getMonth())]}!
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
              spacing={{ base: 4, lg: 6 }} 
              display={{ base: "none", md: "grid" }}
              alignItems="stretch"
            >
              <SalesSummary data={resumenData} />
              <SalesStats data={resumenData} />
              <SurfaceChartCard data={resumenData} isCurrentMonth={isCurrentMonthView} />
            </SimpleGrid>

            {/* VISTA MÓVIL (Carrusel deslizable asistido con flechas y dots) */}
            <Box display={{ base: "block", md: "none" }} position="relative" w="full">
              <Flex
                ref={carouselRef}
                onScroll={handleScroll}
                overflowX="auto"
                scrollSnapType="x mandatory"
                gap={3.5}
                py={2}
                px={1}
                sx={{
                  "&::-webkit-scrollbar": { display: "none" },
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <Box flexShrink={0} w="84vw" maxW="335px" scrollSnapAlign="center">
                  <SalesSummary data={resumenData} />
                </Box>
                <Box flexShrink={0} w="84vw" maxW="335px" scrollSnapAlign="center">
                  <SalesStats data={resumenData} />
                </Box>
                <Box flexShrink={0} w="84vw" maxW="335px" scrollSnapAlign="center">
                  <SurfaceChartCard data={resumenData} isCurrentMonth={isCurrentMonthView} />
                </Box>
              </Flex>

              {/* Flecha circular flotante izquierda */}
              <IconButton
                aria-label="Anterior"
                icon={<ChevronLeftIcon w={6} h={6} />}
                position="absolute"
                left={-1}
                top="50%"
                transform="translateY(-50%)"
                zIndex={2}
                size="sm"
                borderRadius="full"
                bg="white"
                boxShadow="md"
                border="1px solid"
                borderColor="gray.100"
                onClick={handlePrev}
                isDisabled={activeCardIndex === 0}
                opacity={activeCardIndex === 0 ? 0.3 : 1}
              />

              {/* Flecha circular flotante derecha */}
              <IconButton
                aria-label="Siguiente"
                icon={<ChevronRightIcon w={6} h={6} />}
                position="absolute"
                right={-1}
                top="50%"
                transform="translateY(-50%)"
                zIndex={2}
                size="sm"
                borderRadius="full"
                bg="white"
                boxShadow="md"
                border="1px solid"
                borderColor="gray.100"
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
        <DashboardCommercialPanel 
          selectedSeller={selectedSellerOption}
          selectedSellerCode={querySlpCode}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          canFilterSellers={canFilterSellers}
        />
      </Box>
    </Box>
  );
}