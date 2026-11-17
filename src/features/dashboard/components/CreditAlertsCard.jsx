import React, { useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Icon,
  Skeleton,
  SkeletonCircle,
  useBreakpointValue
} from "@chakra-ui/react";
import {
  FiAlertCircle,
  FiArrowRight,
  FiSmile,
  FiBriefcase
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useGetAccountsReceivable } from "../../receivable/hooks/receivableQueries";
import { useHeaderTheme } from "../../../hooks/useHeaderTheme";

export function CreditAlertsCard({ selectedSeller, canFilterSellers }) {
  const navigate = useNavigate();
  const { username, salesEmployeeCode } = useAuthStore();
  const { theme } = useHeaderTheme();
  const isGreen = !theme?.key || theme.key === "green";
  const sellerBadgeScheme = isGreen ? "green" : (theme?.accentColorScheme || "green");

  const isSellerProfile = !!salesEmployeeCode;

  // Si es un vendedor regular (sin permisos de filtro), ve su propia cartera
  // Si tiene permisos de filtro (Admin, Supervisor, etc.):
  // - Si eligió un vendedor específico: filtra por dicho vendedor
  // - Si eligió "Todos los vendedores" (value 0): consulta general de la empresa
  let vendedorNombre = "";
  if (isSellerProfile && !canFilterSellers) {
    vendedorNombre = username;
  } else if (selectedSeller && selectedSeller.value !== 0) {
    const rawLabel = selectedSeller.label || "";
    vendedorNombre = rawLabel.includes(".") ? rawLabel.split(".")[1]?.trim() : rawLabel.trim();
  } else {
    vendedorNombre = "";
  }

  // Habilitar la consulta siempre para obtener el listado de clientes
  const { data, isLoading } = useGetAccountsReceivable(
    { vendedor: vendedorNombre },
    true
  );

  // Estructura devuelta por el API /reportModule/accountsReceivable
  const allClients = useMemo(() => {
    return data?.clients?.clients || data?.clients || data?.data || (Array.isArray(data) ? data : []);
  }, [data]);

  // Helper para identificar si un cliente es de TARJETA AZUL (Saldo a favor / Nota de crédito)
  const isClientCredit = (c) => {
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);
    
    if (overduePEN < 0 || overdueUSD < 0) return true;
    if (overduePEN > 0 || overdueUSD > 0) return false;

    const hasCreditDoc =
      c.tipoDocumento === "Nota de Crédito" ||
      c.documents?.some((d) => d.tipoDocumento === "Nota de Crédito" || d.tipoDocumentoSAP === "07");
    return hasCreditDoc;
  };

  // Helper para obtener la deuda vencida equivalente en USD (TC S/ 3.43)
  const getEquivUSD = (c) => {
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);
    const penVal = overduePEN > 0 ? overduePEN / 3.43 : 0;
    const usdVal = overdueUSD > 0 ? overdueUSD : 0;
    return penVal + usdVal;
  };

  // RN-COB-01 & RN-COB-02: Ranking por Criticidad Financiera y Umbral Mínimo Anti-Ruido ($10 USD)
  const MIN_CRITICAL_DEBT_USD = 10.00;

  const criticalClients = useMemo(() => {
    return allClients
      .filter((c) => {
        if (isClientCredit(c)) return false;
        const overdueDocs = Number(c.overdueDocumentsCount ?? c.documentosVencidos ?? 0);
        const equivUSD = getEquivUSD(c);
        return overdueDocs > 0 && equivUSD >= MIN_CRITICAL_DEBT_USD;
      })
      .sort((a, b) => getEquivUSD(b) - getEquivUSD(a)); // Mayor deuda vencida para encajar perfectamente con la tarjeta de productos sin scrollbar
  }, [allClients]);
  const itemCount = useBreakpointValue({ base: 3, lg: 5 }) || 4;
  const displayClients = useMemo(() => criticalClients.slice(0, itemCount), [criticalClients, itemCount]);

  // ─── Renderizado del cuerpo de la tarjeta ──────────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <VStack spacing={2.5} align="stretch" w="100%">
          {[...Array(5)].map((_, i) => (
            <Flex
              key={i}
              align="center"
              gap={3}
              p={3}
              borderRadius="2xl"
              bg="gray.50"
            >
              <SkeletonCircle size="32px" flexShrink={0} />
              <Box flex={1}>
                <Skeleton height="13px" mb={1.5} borderRadius="md" />
                <Skeleton height="11px" width="65%" borderRadius="md" />
              </Box>
            </Flex>
          ))}
        </VStack>
      );
    }

    if (displayClients.length > 0) {
      return (
        <VStack spacing={{ base: 1.5, md: 2.5 }} align="stretch" w="100%">
          {displayClients.map((client, idx) => {
            const clientName = client.clientName || client.nombre || client.cardName || "Cliente";
            const docNum = client.clientCode || client.ruc || client.licTradNum || "";
            const overdueDocs = Number(client.overdueDocumentsCount ?? client.documentosVencidos ?? 1);

            // Mapeo exclusivo de SALDO VENCIDO
            const overduePEN = Number(client.overdueAmount?.PEN ?? client.saldoVencidoPEN ?? 0);
            const overdueUSD = Number(client.overdueAmount?.USD ?? client.saldoVencidoUSD ?? 0);

            let formattedAmount = "";
            if (overdueUSD > 0 && overduePEN > 0) {
              formattedAmount = `S/ ${overduePEN.toLocaleString("es-PE", { minimumFractionDigits: 2 })} + $ ${overdueUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
            } else if (overdueUSD > 0) {
              formattedAmount = `$ ${overdueUSD.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
            } else {
              formattedAmount = `S/ ${overduePEN.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
            }

            return (
              <Box
                key={client.clientCode || client.ruc || idx}
                py={{ base: 1.5, md: 2.5 }}
                px={{ base: 2, md: 3.5 }}
                borderRadius={{ base: "lg", md: "2xl" }}
                bg="gray.50"
                border="1px solid"
                borderColor="gray.100"
                transition="all 0.2s"
                _hover={{ bg: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.06)", borderColor: "red.200" }}
              >
                <Flex align="center" justify="space-between" gap={2}>
                  <HStack spacing={{ base: 1.5, md: 2.5 }} minW={0} flex={1}>
                    {/* Ícono de Empresa / Cliente para diferenciar visualmente de la cabecera */}
                    <Flex
                      w={{ base: "22px", md: "34px" }}
                      h={{ base: "22px", md: "34px" }}
                      borderRadius="md"
                      bg="gray.100"
                      color="gray.600"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <Icon as={FiBriefcase} boxSize={{ base: 2.5, md: 4 }} />
                    </Flex>
                    <Box minW={0} flex={1}>
                      <HStack spacing={1} mb={0.5} flexWrap="wrap">
                        <Text
                          fontWeight="750"
                          fontSize={{ base: "10.5px", sm: "xs", md: "sm" }}
                          color="gray.800"
                          noOfLines={1}
                        >
                          {clientName}
                        </Text>
                        {(() => {
                          const eqUSD = getEquivUSD(client);
                          if (eqUSD >= 500) {
                            return <Badge colorScheme="red" variant="solid" borderRadius="full" fontSize={{ base: "7.5px", md: "10px" }} px={{ base: 1.5, md: 2.5 }} flexShrink={0}>🔴 ALTO RIESGO ({overdueDocs})</Badge>;
                          }
                          if (eqUSD >= 100) {
                            return <Badge colorScheme="orange" variant="solid" borderRadius="full" fontSize={{ base: "7.5px", md: "10px" }} px={{ base: 1.5, md: 2.5 }}>🟠 MORA ALTA ({overdueDocs})</Badge>;
                          }
                          return <Badge colorScheme="red" variant="subtle" borderRadius="full" fontSize={{ base: "7.5px", md: "10px" }} px={{ base: 1.5, md: 2.5 }} flexShrink={0}>MORA ({overdueDocs})</Badge>;
                        })()}
                      </HStack>
                      <Text fontSize={{ base: "9.5px", md: "xs" }} color="gray.500" fontWeight="medium" noOfLines={1}>
                        {docNum && (
                          <Text as="span" color="gray.600" fontWeight="600">
                            {docNum} •{" "}
                          </Text>
                        )}
                        <Text as="span" color="red.600" fontWeight="800">
                          Saldo vencido: {formattedAmount}
                        </Text>
                      </Text>
                    </Box>
                  </HStack>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      );
    }

    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        py={6}
        px={4}
        bg="gray.50"
        borderRadius="2xl"
        textAlign="center"
      >
        <Flex
          w="40px"
          h="40px"
          borderRadius="full"
          bg={isGreen ? "green.50" : (theme?.accentLightBg || "green.50")}
          color={isGreen ? "green.600" : (theme?.accentTextColor || "green.600")}
          align="center"
          justify="center"
          mb={2}
        >
          <Icon as={FiSmile} boxSize={5} />
        </Flex>
        <Text fontWeight="700" fontSize="sm" color="gray.800">
          ¡Excelente estado!
        </Text>
        <Text fontSize="xs" color="gray.500" mt={0.5}>
          {vendedorNombre
            ? `No hay clientes con facturas vencidas para ${vendedorNombre}.`
            : "No hay clientes con facturas vencidas en la cartera general."}
        </Text>
      </Flex>
    );
  };

  return (
    <Box
      w="full"
      h="100%"
      bg="white"
      borderRadius={{ base: "xl", md: "3xl" }}
      p={{ base: 2.5, sm: 3.5, md: 5 }}
      boxShadow="0 10px 30px rgba(0,0,0,0.04)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ boxShadow: "0 12px 35px rgba(0,0,0,0.07)" }}
      flex={1}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
    >
      <Box flex={1} display="flex" flexDirection="column">
        {/* Header Tarjeta */}
        <Flex align="center" justify="space-between" mb={{ base: 1.5, md: 4 }} gap={2}>
          <HStack spacing={{ base: 1.5, sm: 3 }} minW={0} flex={1}>
            <Flex
              w={{ base: "26px", sm: "38px", md: "42px" }}
              h={{ base: "26px", sm: "38px", md: "42px" }}
              borderRadius={{ base: "md", md: "2xl" }}
              bg="red.50"
              align="center"
              justify="center"
              color="red.600"
              flexShrink={0}
            >
              <Icon as={FiAlertCircle} boxSize={{ base: 3.5, md: 5 }} />
            </Flex>
            <Box minW={0} flex={1}>
              <Flex gap={1.5} flexWrap="wrap" align="center">
                <Text
                  fontSize={{ base: "12.5px", sm: "sm", md: "md" }}
                  fontWeight="800"
                  color="gray.800"
                  letterSpacing="tight"
                  lineHeight="shorter"
                >
                  Alertas de Crédito y Mora
                </Text>
                {criticalClients.length > 0 && (
                  <Badge
                    colorScheme={vendedorNombre ? sellerBadgeScheme : "red"}
                    borderRadius="full"
                    px={{ base: 1.5, md: 2.5 }}
                    py={0.2}
                    fontSize={{ base: "8.5px", md: "10px" }}
                    fontWeight="800"
                    flexShrink={0}
                  >
                    {vendedorNombre ? `${vendedorNombre.toUpperCase()} (${criticalClients.length})` : `${criticalClients.length} CRÍTICOS`}
                  </Badge>
                )}
              </Flex>
              <Text
                fontSize="xs"
                color="gray.500"
                display={{ base: "none", lg: "block" }}
                sx={{ "@media (max-width: 991px)": { display: "none !important" } }}
                noOfLines={1}
              >
                {isSellerProfile && !canFilterSellers
                  ? "Estado de cuenta de clientes a tu cargo"
                  : vendedorNombre
                    ? `Clientes en mora asignados a ${vendedorNombre}`
                    : "Clientes con mayor saldo vencido a nivel empresa"}
              </Text>
            </Box>
          </HStack>

          <Button
            variant="ghost"
            size="xs"
            colorScheme="red"
            rightIcon={<FiArrowRight />}
            onClick={() => navigate("/receivable")}
            flexShrink={0}
            px={1}
            h={{ base: "20px", md: "24px" }}
            fontSize={{ base: "10.5px", md: "11px" }}
          >
            Ver Lista
          </Button>
        </Flex>

        {/* Lista de Clientes Críticos */}
        {renderContent()}
      </Box>

      {/* Footer Simétrico de la Tarjeta */}
      <Box pt={{ base: 1.5, md: 3 }} mt="auto" borderTop="1px solid" borderColor="gray.100">
        <Button
          size="xs"
          variant="ghost"
          colorScheme="red"
          rightIcon={<FiArrowRight />}
          onClick={() => navigate("/receivable")}
          w="100%"
          h={{ base: "22px", md: "28px" }}
          fontSize={{ base: "10px", md: "xs" }}
          fontWeight="700"
        >
          {criticalClients.length > displayClients.length
            ? `Ver ${criticalClients.length - displayClients.length} clientes con mora adicionales...`
            : "Ver lista completa de clientes con mora"}
        </Button>
      </Box>
    </Box>
  );
}
