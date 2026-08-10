import React from "react";
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

export function CreditAlertsCard() {
  const navigate = useNavigate();
  const { username, salesEmployeeCode } = useAuthStore();

  const isSellerProfile = !!salesEmployeeCode;
  const vendedorNombre = isSellerProfile ? username : "";

  // Habilitar la consulta siempre para obtener el listado de clientes
  const { data, isLoading } = useGetAccountsReceivable(
    { vendedor: vendedorNombre },
    true
  );

  // Estructura devuelta por el API /reportModule/accountsReceivable
  const allClients = data?.clients?.clients || data?.clients || data?.data || (Array.isArray(data) ? data : []);

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

  const criticalClients = allClients
    .filter((c) => {
      if (isClientCredit(c)) return false;
      const overdueDocs = Number(c.overdueDocumentsCount ?? c.documentosVencidos ?? 0);
      const equivUSD = getEquivUSD(c);
      return overdueDocs > 0 && equivUSD >= MIN_CRITICAL_DEBT_USD;
    })
    .sort((a, b) => getEquivUSD(b) - getEquivUSD(a)); // Mayor deuda vencida para encajar perfectamente con la tarjeta de productos sin scrollbar
  const itemCount = useBreakpointValue({ base: 3, lg: 5 }) || 4;
  const displayClients = criticalClients.slice(0, itemCount);

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
        <VStack spacing={2.5} align="stretch" w="100%">
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
                py={2.5}
                px={3.5}
                borderRadius="2xl"
                bg="gray.50"
                border="1px solid"
                borderColor="gray.100"
                transition="all 0.2s"
                _hover={{ bg: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.06)", borderColor: "red.200" }}
              >
                <Flex align="center" justify="space-between" gap={2}>
                  <HStack spacing={2.5} minW={0} flex={1}>
                    {/* Ícono de Empresa / Cliente para diferenciar visualmente de la cabecera */}
                    <Flex
                      w="34px"
                      h="34px"
                      borderRadius="xl"
                      bg="gray.100"
                      color="gray.600"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <Icon as={FiBriefcase} boxSize={4} />
                    </Flex>
                    <Box minW={0} flex={1}>
                      <HStack spacing={2} mb={0.5} flexWrap="nowrap">
                        <Text
                          fontWeight="750"
                          fontSize={{ base: "xs", sm: "sm" }}
                          color="gray.800"
                          noOfLines={1}
                        >
                          {clientName}
                        </Text>
                        {(() => {
                          const eqUSD = getEquivUSD(client);
                          if (eqUSD >= 500) {
                            return <Badge colorScheme="red" variant="solid" borderRadius="full" fontSize="10px" px={2.5} flexShrink={0}>🔴 ALTO RIESGO ({overdueDocs})</Badge>;
                          }
                          if (eqUSD >= 100) {
                            return <Badge colorScheme="orange" variant="solid" borderRadius="full" fontSize="10px" px={2.5}>🟠 MORA ALTA ({overdueDocs})</Badge>;
                          }
                          return <Badge colorScheme="red" variant="subtle" borderRadius="full" fontSize="10px" px={2.5} flexShrink={0}>MORA ({overdueDocs})</Badge>;
                        })()}
                      </HStack>
                      <Text fontSize="xs" color="gray.500" fontWeight="medium" noOfLines={1}>
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
          bg="green.50"
          color="green.600"
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
          No tienes ningún cliente con facturas vencidas.
        </Text>
      </Flex>
    );
  };

  return (
    <Box
      w="full"
      h="100%"
      bg="white"
      borderRadius="3xl"
      p={{ base: 4, sm: 5, md: 5 }}
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
        <Flex align="center" justify="space-between" mb={4} gap={2}>
          <HStack spacing={{ base: 2, sm: 3 }} minW={0} flex={1}>
            <Flex
              w={{ base: "38px", sm: "42px" }}
              h={{ base: "38px", sm: "42px" }}
              borderRadius="2xl"
              bg="red.50"
              align="center"
              justify="center"
              color="red.600"
              flexShrink={0}
            >
              <Icon as={FiAlertCircle} boxSize={5} />
            </Flex>
            <Box minW={0}>
              <HStack spacing={1.5} flexWrap="nowrap" align="center">
                <Text
                  fontSize={{ base: "sm", sm: "md" }}
                  fontWeight="800"
                  color="gray.800"
                  letterSpacing="tight"
                  lineHeight="shorter"
                  whiteSpace="nowrap"
                >
                  Alertas de Crédito y Mora
                </Text>
                {criticalClients.length > 0 && (
                  <Badge
                    colorScheme="red"
                    borderRadius="full"
                    px={2.5}
                    py={0.5}
                    fontSize="10px"
                    fontWeight="800"
                    flexShrink={0}
                  >
                    {criticalClients.length} CRÍTICOS
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500" display={{ base: "none", xl: "block" }} noOfLines={1}>
                Estado de cuenta de clientes a tu cargo
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
            px={1.5}
          >
            Ver Lista
          </Button>
        </Flex>

        {/* Lista de Clientes Críticos */}
        {renderContent()}
      </Box>

      {/* Footer Simétrico de la Tarjeta */}
      <Box pt={3} mt="auto" borderTop="1px solid" borderColor="gray.100">
        <Button
          size="xs"
          variant="ghost"
          colorScheme="red"
          rightIcon={<FiArrowRight />}
          onClick={() => navigate("/receivable")}
          w="100%"
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
