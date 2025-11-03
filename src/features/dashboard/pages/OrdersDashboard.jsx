// src/pages/OrdersDashboard/OrdersDashboard.jsx
import {
  Box,
  Heading,
  useColorModeValue,
  Container,
  VStack,
  SimpleGrid,
  Divider,
  Flex,
  Text,
  Badge,
  HStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import {
  useQuotesSellers,
  useQuotesSellersAdmin,
  useDashboardMotives,
  useOrdersCancelated,
  useTopCanceled,
  useTopSelled,
} from "../hooks/queries/dashboardQueries";
import { Button, Icon, useDisclosure } from "@chakra-ui/react";
import { FilterIcon } from "lucide-react";

import FiltersBar from "../components/OrdersDashboards/FiltersBar";
import SummaryCards from "../components/OrdersDashboards/SummaryCards";
import ChartsSection from "../components/OrdersDashboards/ChartsSection";
import OrdersMotive from "../components/OrdersDashboards/OrdersMotive";
import OrdersCancelatedTable from "../components/OrdersDashboards/OrdersCancelatedTable";
import TopCanceledTable from "../components/OrdersDashboards/TopCanceledTable";
import TopSelledTable from "../components/OrdersDashboards/TopSelledTable";
import { BackButton } from "../../../components/BackButton";
import FiltersBarDrawer from "../components/OrdersDashboards/FiltersBarDrawer";

export default function OrdersDashboard() {
  const { salesEmployeeCode } = useAuthStore();
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue("#0B3D2E", "#0B3D2E");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textPrimary = "#004B2D";

  const querySlpCode = isVendedor ? salesEmployeeCode : 0;
  const currentYear = new Date().getFullYear();
  const defaultMonth = format(subMonths(new Date(), 0), "MM");

  const [filters, setFilters] = useState({
    yearFrom: currentYear,
    monthFrom: 1,
    monthTo: 12,
    sellerCode: querySlpCode,
  });

  const { data: vendedorData, isLoading: vendedorLoading, error: vendedorError } =
    useQuotesSellers({ slpCode: querySlpCode, month: defaultMonth }, { enabled: isVendedor });

  const { data: adminData, isLoading: adminLoading, error: adminError } =
    useQuotesSellersAdmin({ slpCode: querySlpCode, month: defaultMonth }, { enabled: isAdmin });

  const { data: ordersMotive, isLoading: motivesLoading, error: motivesError } =
    useDashboardMotives({
      yearFrom: filters.yearFrom,
      monthFrom: filters.monthFrom,
      monthTo: filters.monthTo,
      slpCode: isVendedor ? salesEmployeeCode : filters.sellerCode,
    });

  const { data: cancelledOrders, isLoading: ordersCancelatedLoading, error: ordersCancelatedError } =
    useOrdersCancelated({
      yearFrom: filters.yearFrom,
      monthFrom: filters.monthFrom,
      monthTo: filters.monthTo,
      slpCode: isVendedor ? salesEmployeeCode : filters.sellerCode,
    });

  const { data: topCanceled, isLoading: topCanceledLoading, error: topCanceledError } =
    useTopCanceled({
      yearFrom: filters.yearFrom,
      monthFrom: filters.monthFrom,
      monthTo: filters.monthTo,
      slpCode: isVendedor ? salesEmployeeCode : filters.sellerCode,
    });

  const { data: topSelled, isLoading: topSelledLoading, error: topSelledError } =
    useTopSelled({
      yearFrom: filters.yearFrom,
      monthFrom: filters.monthFrom,
      monthTo: filters.monthTo,
      slpCode: isVendedor ? salesEmployeeCode : filters.sellerCode,
    });

  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;
  const resumenData = isVendedor ? vendedorData?.[0] ?? null : adminData ?? null;

  const handleApplyFilters = (newFilters) => {
    if (isVendedor) {
      setFilters({
        ...newFilters,
        sellerCode: salesEmployeeCode,
      });
    } else {
      setFilters(newFilters);
    }
  };

  const SectionCard = ({ children, title }) => (
    <Box
      bg={cardBg}
      p={4}
      borderRadius="lg"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      transition="all 0.2s"
    >
      {title && (
        <Heading size="sm" color={textPrimary} mb={3}>
          {title}
        </Heading>
      )}
      {children}
    </Box>
  );

  return (
    <Box
      bg={bgColor}
      minH="100vh"
      py={4}
      px={{ base: 3, md: 4, lg: 6 }}
      fontFamily="'InterVariable', sans-serif"
    >
      <Container maxW="container.2xl">
        <VStack spacing={4} align="stretch">
          {/* 🔙 Header */}
          <Box mb={3}>
            <Flex align="center" justify="center" position="relative">
              <Box position="absolute" left="0">
                <BackButton />
              </Box>
              <Heading color="white" size="md">
                Dashboard de Órdenes
              </Heading>
            </Flex>
          </Box>

          {/* 🔍 Filtros */}
          <>
            <Button
              leftIcon={<Icon as={FilterIcon} />}
              colorScheme="green"
              onClick={onOpen}
              size="sm"
            >
              Filtros
            </Button>

            <FiltersBarDrawer
              isOpen={isOpen}
              onClose={onClose}
              initialFilters={filters}
              onApply={handleApplyFilters}
              hideSellerField={isVendedor}
            />
          </>

          {/* 📊 Secciones */}
          <SectionCard>
            <SummaryCards data={resumenData} isLoading={isLoading} error={error} />
          </SectionCard>

          <SectionCard title="Gráficos de desempeño">
            <ChartsSection data={resumenData} />
          </SectionCard>

          <SectionCard title="Motivos de cancelación">
            <OrdersMotive
              ordersMotive={ordersMotive}
              isLoading={motivesLoading}
              isError={motivesError}
            />
          </SectionCard>

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
            <SectionCard title="Top cancelados">
              <TopCanceledTable
                data={topCanceled}
                isLoading={topCanceledLoading}
                isError={topCanceledError}
              />
            </SectionCard>

            <SectionCard title="Top vendidos">
              <TopSelledTable
                data={topSelled}
                isLoading={topSelledLoading}
                isError={topSelledError}
              />
            </SectionCard>
          </SimpleGrid>

          <SectionCard title="Órdenes canceladas recientemente">
            <OrdersCancelatedTable
              data={cancelledOrders}
              isLoading={ordersCancelatedLoading}
              isError={ordersCancelatedError}
            />
          </SectionCard>
        </VStack>
      </Container>
    </Box>
  );
}
