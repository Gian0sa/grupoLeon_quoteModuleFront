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
  Spinner
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

  // Filtrar ÚNICAMENTE clientes con MORA REAL (facturas vencidas o saldo vencido > 0)
  const criticalClients = allClients.filter((c) => {
    const overdueDocs = Number(c.overdueDocumentsCount ?? c.documentosVencidos ?? 0);
    const overduePEN = Number(c.overdueAmount?.PEN ?? c.saldoVencidoPEN ?? 0);
    const overdueUSD = Number(c.overdueAmount?.USD ?? c.saldoVencidoUSD ?? 0);

    return overdueDocs > 0 || overduePEN > 0 || overdueUSD > 0;
  });

  // Mostrar 4 clientes para mantener simetría exacta con la tarjeta de Top Productos (4 ítems)
  const displayClients = criticalClients.slice(0, 4);

  // ─── Renderizado del cuerpo de la tarjeta ──────────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <Flex justify="center" align="center" py={8}>
          <Spinner color="red.600" size="md" />
        </Flex>
      );
    }

    if (displayClients.length > 0) {
      return (
        <VStack spacing={3} align="stretch" w="100%">
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
                p={{ base: 3, sm: 3.5 }}
                borderRadius="2xl"
                bg="gray.50"
                transition="all 0.2s"
                _hover={{ bg: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}
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
                      <HStack spacing={2} mb={0.5} flexWrap="wrap">
                        <Text
                          fontWeight="700"
                          fontSize={{ base: "xs", sm: "sm" }}
                          color="gray.800"
                          noOfLines={1}
                        >
                          {clientName}
                        </Text>
                        <Badge colorScheme="red" variant="solid" borderRadius="full" fontSize="10px" px={2}>
                          MORA ({overdueDocs})
                        </Badge>
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

          {criticalClients.length > 4 && (
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => navigate("/receivable")}
              w="100%"
              mt={1}
            >
              Ver {criticalClients.length - 4} clientes con mora adicionales...
            </Button>
          )}
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
      bg="white"
      borderRadius="3xl"
      p={{ base: 4, sm: 5, md: 6 }}
      boxShadow="0 10px 30px rgba(0,0,0,0.04)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ boxShadow: "0 12px 35px rgba(0,0,0,0.07)" }}
    >
      {/* Header Tarjeta */}
      <Flex align="center" justify="space-between" mb={5} gap={2}>
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
            <HStack spacing={1.5} flexWrap="wrap">
              <Text
                fontSize={{ base: "sm", sm: "md", md: "lg" }}
                fontWeight="800"
                color="gray.800"
                letterSpacing="tight"
                lineHeight="shorter"
              >
                Alertas de Crédito y Mora
              </Text>
              {criticalClients.length > 0 && (
                <Badge colorScheme="red" borderRadius="full" px={2} py={0.5} fontSize="10px">
                  {criticalClients.length} Críticos
                </Badge>
              )}
            </HStack>
            <Text fontSize="xs" color="gray.500" display={{ base: "none", sm: "block" }}>
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
  );
}
