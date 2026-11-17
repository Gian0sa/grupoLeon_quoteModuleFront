import React from "react";
import { Box, HStack, Text, Badge, Spinner, Tooltip } from "@chakra-ui/react";
import { useSapStatus } from "../hooks/queries/quotesQueries";
import { useIsAdmin } from "../../../shared/utils/permissions";
import { useHeaderTheme } from "../../../hooks/useHeaderTheme";

export function SapEnvironmentBadge() {
  const isAdmin = useIsAdmin();
  const { theme } = useHeaderTheme();
  const isDarkText = Boolean(theme?.useDarkText);
  const { data, isLoading, isFetching, refetch } = useSapStatus({ enabled: Boolean(isAdmin) });

  // 🛡️ Solo visible para administradores. Los vendedores no deben ver el estado ni la BD de SAP.
  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Box
        display="inline-flex"
        alignItems="center"
        gap={1.5}
        bg={isDarkText ? "rgba(255, 255, 255, 0.55)" : "whiteAlpha.200"}
        border="1px solid"
        borderColor={isDarkText ? theme.glassBorder : "whiteAlpha.300"}
        color={isDarkText ? theme.textColor : "whiteAlpha.900"}
        px={3}
        py={1}
        borderRadius="full"
        fontSize="xs"
        fontWeight="700"
        backdropFilter="blur(4px)"
      >
        <Spinner size="xs" color={isDarkText ? theme.textColor : "white"} speed="0.7s" />
        <Text as="span">Verificando SBO...</Text>
      </Box>
    );
  }

  const companyDB = data?.companyDB || "SBO_AJUSTES_2025";
  const isProd = Boolean(data?.isProd);
  const environment = data?.environment || (isProd ? "PRODUCCIÓN" : "PRUEBAS");

  if (isProd) {
    return (
      <Tooltip label="Base de datos oficial de SAP Business One (Producción). Toca para re-verificar." hasArrow placement="bottom">
        <HStack
          as="button"
          onClick={() => refetch()}
          spacing={2}
          bg={isDarkText ? "rgba(255, 255, 255, 0.72)" : "rgba(16, 185, 129, 0.22)"}
          border="1.5px solid"
          borderColor={isDarkText ? "#059669" : "#34d399"}
          color={isDarkText ? "#065f46" : "#ecfdf5"}
          px={3}
          py={1}
          borderRadius="full"
          fontSize="xs"
          fontWeight="800"
          boxShadow="0 2px 10px rgba(0,0,0,0.14)"
          backdropFilter="blur(4px)"
          cursor="pointer"
          _hover={{
            bg: isDarkText ? "rgba(255, 255, 255, 0.88)" : "rgba(16, 185, 129, 0.35)",
            transform: "translateY(-1px)",
          }}
          _active={{ transform: "scale(0.97)" }}
          transition="all 0.15s ease-in-out"
        >
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={isDarkText ? "#059669" : "#34d399"}
            boxShadow="0 0 8px #10b981"
            flexShrink={0}
          />
          <Text as="span" letterSpacing="wide">
            Conectado a SBO:{" "}
            <Text as="strong" color={isDarkText ? "#064e3b" : "white"}>
              {companyDB}
            </Text>
          </Text>
          <Badge
            colorScheme="green"
            variant="solid"
            bg="#15803d"
            color="white"
            fontSize="10px"
            px={1.5}
            py={0.2}
            borderRadius="md"
            fontWeight="900"
          >
            PRODUCCIÓN
          </Badge>
          {isFetching && <Spinner size="xs" color={isDarkText ? "#065f46" : "white"} />}
        </HStack>
      </Tooltip>
    );
  }

  return (
    <Tooltip label="Base de datos de pruebas/ajustes SAP Business One. Toca para re-verificar." hasArrow placement="bottom">
      <HStack
        as="button"
        onClick={() => refetch()}
        spacing={2}
        bg={isDarkText ? "rgba(255, 255, 255, 0.72)" : "rgba(245, 158, 11, 0.24)"}
        border="1.5px solid"
        borderColor={isDarkText ? "#d97706" : "#fbbf24"}
        color={isDarkText ? "#78350f" : "#fef3c7"}
        px={3}
        py={1}
        borderRadius="full"
        fontSize="xs"
        fontWeight="800"
        boxShadow="0 2px 10px rgba(0,0,0,0.14)"
        backdropFilter="blur(4px)"
        cursor="pointer"
        _hover={{
          bg: isDarkText ? "rgba(255, 255, 255, 0.88)" : "rgba(245, 158, 11, 0.38)",
          transform: "translateY(-1px)",
        }}
        _active={{ transform: "scale(0.97)" }}
        transition="all 0.15s ease-in-out"
      >
        <Box
          w="8px"
          h="8px"
          borderRadius="full"
          bg={isDarkText ? "#d97706" : "#fbbf24"}
          boxShadow="0 0 8px #f59e0b"
          flexShrink={0}
        />
        <Text as="span" letterSpacing="wide">
          Conectado a SBO:{" "}
          <Text as="strong" color={isDarkText ? "#451a03" : "white"}>
            {companyDB}
          </Text>
        </Text>
        <Badge
          colorScheme="yellow"
          variant="solid"
          bg="#d97706"
          color="white"
          fontSize="10px"
          px={1.5}
          py={0.2}
          borderRadius="md"
          fontWeight="900"
        >
          {environment}
        </Badge>
        {isFetching && <Spinner size="xs" color={isDarkText ? "#78350f" : "white"} />}
      </HStack>
    </Tooltip>
  );
}

export default SapEnvironmentBadge;
