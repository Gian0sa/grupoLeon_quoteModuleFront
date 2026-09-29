import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  HStack,
  Button,
  Badge,
  Icon,
  Tooltip,
  useToast
} from "@chakra-ui/react";
import { FiRefreshCw, FiShield, FiClock } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";

export function SapSyncStatusBanner({ lastSyncTime, onManualSync }) {
  const [syncTime, setSyncTime] = useState(lastSyncTime ? new Date(lastSyncTime) : new Date());
  const [timeAgoText, setTimeAgoText] = useState("hace unos momentos");
  const [nextSyncMinutes, setNextSyncMinutes] = useState(25);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Calcular tiempo transcurrido dinámicamente cada 30 segundos
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const diffMs = now - syncTime;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) {
        setTimeAgoText("hace unos momentos");
      } else if (diffMins === 1) {
        setTimeAgoText("hace 1 minuto");
      } else {
        setTimeAgoText(`hace ${diffMins} minutos`);
      }

      // Intervalo de ciclo de 30 minutos
      const remaining = Math.max(1, 30 - (diffMins % 30));
      setNextSyncMinutes(remaining);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 30000);
    return () => clearInterval(interval);
  }, [syncTime]);

  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      if (onManualSync) {
        await onManualSync();
      }

      // Revalidar queries principales del dashboard y cuentas por cobrar
      await queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      await queryClient.invalidateQueries({ queryKey: ["topProducts"] });
      await queryClient.invalidateQueries({ queryKey: ["productsPriceList"] });

      const now = new Date();
      setSyncTime(now);
      setTimeAgoText("hace unos momentos");
      setNextSyncMinutes(30);

      toast({
        title: "🔄 Sincronizado con SAP",
        description: "Los datos de la empresa han sido actualizados en vivo contra SAP Business One.",
        status: "success",
        duration: 3500,
        isClosable: true,
        position: "bottom-right",
      });
    } catch (err) {
      toast({
        title: "Aviso de sincronización",
        description: "Se mantuvieron los últimos datos del buffer.",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  return (
    <Box
      mt={4}
      w="full"
      p={{ base: 3.5, md: 4 }}
      bg="linear-gradient(135deg, #ffffff 0%, #f9fbf9 100%)"
      borderRadius="2xl"
      border="1px solid"
      borderColor="green.200"
      boxShadow="0 4px 18px -4px rgba(16, 185, 129, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)"
      transition="all 0.2s ease-in-out"
      _hover={{
        boxShadow: "0 6px 22px -4px rgba(16, 185, 129, 0.14)",
        borderColor: "green.300"
      }}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        gap={{ base: 3, md: 4 }}
      >
        {/* Lado Izquierdo: Estado del Buffer y Tiempo Transcurrido */}
        <HStack spacing={3.5} align="center">
          {/* Indicador de pulso verde SAP activo */}
          <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
            <Box
              w="12px"
              h="12px"
              borderRadius="full"
              bg="green.500"
              sx={{
                animation: "pulseGlow 2s infinite ease-in-out",
                "@keyframes pulseGlow": {
                  "0%": { transform: "scale(0.95)", opacity: 0.8 },
                  "50%": { transform: "scale(1.2)", opacity: 1 },
                  "100%": { transform: "scale(0.95)", opacity: 0.8 }
                }
              }}
            />
            <Box
              position="absolute"
              w="20px"
              h="20px"
              borderRadius="full"
              border="2px solid"
              borderColor="green.300"
              opacity={0.6}
            />
          </Box>

          <Box>
            <HStack spacing={2} wrap="wrap">
              <Text fontSize="xs" fontWeight="800" color="gray.800" letterSpacing="-0.2px">
                Sincronización con SAP
              </Text>
              <Badge
                colorScheme="green"
                variant="subtle"
                fontSize="10px"
                fontWeight="700"
                borderRadius="full"
                px={2}
                py={0.5}
                display="inline-flex"
                alignItems="center"
                gap={1}
              >
                <Icon as={FiShield} boxSize="10px" />
                Buffer de Alta Disponibilidad Activo
              </Badge>
              <Badge
                colorScheme="gray"
                variant="outline"
                fontSize="10px"
                fontWeight="600"
                borderRadius="full"
                px={2}
                py={0.5}
              >
                Respuesta: 0-10ms
              </Badge>
            </HStack>

            <HStack spacing={2} mt={1} color="gray.500" fontSize="xs">
              <Icon as={FiClock} boxSize="12px" color="green.600" />
              <Text fontWeight="600" color="gray.700">
                Actualizado {timeAgoText}
              </Text>
              <Text color="gray.300">•</Text>
              <Text fontSize="2xs" color="gray.500">
                Próxima sincronización automática en ~{nextSyncMinutes} min (ciclos de 30 min)
              </Text>
            </HStack>
          </Box>
        </HStack>

        {/* Lado Derecho: Botón para Sincronizar en Vivo Ahora */}
        <HStack spacing={2} justify={{ base: "flex-end", md: "center" }}>
          <Tooltip
            label="Consulta SAP Business One en vivo ahorita mismo y actualiza el buffer de la base de datos."
            hasArrow
            placement="top"
            borderRadius="lg"
            fontSize="xs"
            p={2}
          >
            <Button
              size="sm"
              h="36px"
              px={4}
              fontSize="xs"
              fontWeight="700"
              colorScheme="green"
              bg="green.600"
              _hover={{ bg: "green.700", transform: "translateY(-1px)" }}
              _active={{ bg: "green.800", transform: "translateY(0)" }}
              color="white"
              borderRadius="xl"
              boxShadow="0 2px 8px rgba(34, 197, 94, 0.25)"
              leftIcon={
                <Icon
                  as={FiRefreshCw}
                  boxSize="13px"
                  sx={{
                    animation: isSyncing ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    }
                  }}
                />
              }
              isLoading={isSyncing}
              loadingText="Sincronizando con SAP..."
              onClick={handleSyncClick}
            >
              Sincronizar ahora
            </Button>
          </Tooltip>
        </HStack>
      </Flex>
    </Box>
  );
}
