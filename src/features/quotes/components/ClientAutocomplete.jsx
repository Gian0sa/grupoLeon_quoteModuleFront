import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Flex, Input, Button, Text, VStack, HStack, Spinner, Badge
} from "@chakra-ui/react";
import { FiSearch, FiX, FiCheckCircle } from "react-icons/fi";
import { useClientQueries, useClientQueriesByName } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";
import { fetchClientByCode } from "../../clients/services/clientService";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { normalizeQuoteClient } from "../stores/quoteStore";

export default function ClientAutocomplete({ client, setClient }) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchingByCode, setIsSearchingByCode] = useState(false);
  const [fallbackResults, setFallbackResults] = useState([]);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);

  const debouncedSearchInput = useDebounce(searchInput, 300);

  useEffect(() => {
    const trimmed = debouncedSearchInput.trim();
    if (!trimmed || trimmed.length < 2) {
      if (!trimmed) {
        setSearchTerm("");
        setFallbackResults([]);
      }
      return;
    }

    const isNumeric = /^\d+$/.test(trimmed) || /^CL/i.test(trimmed);
    setIsSearchingByCode(isNumeric);

    let finalTerm = trimmed;
    if (isNumeric && /^\d+$/.test(trimmed)) {
      finalTerm = `CL${trimmed}`;
    }

    setSearchTerm(finalTerm);
    setFallbackResults([]);
  }, [debouncedSearchInput]);

  const { data: dataByCode, isLoading: isLoadingByCode, error: errorByCode } =
    useClientQueries(isSearchingByCode && searchTerm ? searchTerm : null);

  const { data: dataByName, isLoading: isLoadingByName, error: errorByName } =
    useClientQueriesByName(!isSearchingByCode && searchTerm ? searchTerm : null);

  const isSearching = (isSearchingByCode ? isLoadingByCode : isLoadingByName) || isFallbackLoading;
  const searchError = isSearchingByCode ? errorByCode : errorByName;

  // Extracción de la lista de clientes SAP
  const primaryNameList = useMemo(() => {
    if (!dataByName) return [];
    if (Array.isArray(dataByName.value)) return dataByName.value;
    if (Array.isArray(dataByName.clients)) return dataByName.clients;
    if (Array.isArray(dataByName.clients?.clients)) return dataByName.clients.clients;
    if (Array.isArray(dataByName)) return dataByName;
    return [];
  }, [dataByName]);

  // Búsqueda de respaldo si la consulta primaria devuelve 0 resultados
  useEffect(() => {
    if (!searchTerm || isSearchingByCode) return;

    if (!isLoadingByName && (errorByName || primaryNameList.length === 0)) {
      let isMounted = true;
      setIsFallbackLoading(true);

      const cleanTerm = searchTerm.replace(/^CL/i, "").trim();

      axiosInstance
        .get(`/reportModule/accountsReceivable?clientName=${encodeURIComponent(cleanTerm)}`)
        .then((res) => {
          if (!isMounted) return;
          const list = res.data?.clients?.clients || res.data?.clients || res.data || [];
          if (Array.isArray(list) && list.length > 0) {
            const mapped = list.map((c) => ({
              CardCode: c.cardCode || c.CardCode,
              CardName: c.clientName || c.CardName || c.name,
              Address: c.address || c.Address || "",
            }));
            setFallbackResults(mapped);
          }
        })
        .catch(() => {
          if (isMounted) setFallbackResults([]);
        })
        .finally(() => {
          if (isMounted) setIsFallbackLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setFallbackResults([]);
    }
  }, [searchTerm, isSearchingByCode, isLoadingByName, errorByName, primaryNameList]);

  const activeNameList = primaryNameList.length > 0 ? primaryNameList : fallbackResults;

  const triggerSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const isNumeric = /^\d+$/.test(trimmed) || /^CL/i.test(trimmed);
    setIsSearchingByCode(isNumeric);

    let finalTerm = trimmed;
    if (isNumeric && /^\d+$/.test(trimmed)) {
      finalTerm = `CL${trimmed}`;
    }

    setSearchTerm(finalTerm);
    setFallbackResults([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") triggerSearch();
  };

  const handleSelectClient = async (clientData) => {
    const adapted = adaptClientFromApi(clientData);
    const cardCode = adapted.id || clientData.CardCode || clientData.cardCode;

    // Asignación inmediata para feedback visual rápido
    const initialClient = normalizeQuoteClient({
      ...clientData,
      CardCode: cardCode,
      CardName: adapted.firstName || clientData.CardName || clientData.clientName,
      Address: adapted.address || clientData.Address || clientData.address,
      raw: clientData,
    });

    setClient(initialClient);
    setSearchTerm("");
    setSearchInput("");
    setFallbackResults([]);

    // Cargar la ficha completa de SAP por CardCode para obtener ContactEmployees, ContactPerson y BPAddresses
    if (cardCode) {
      try {
        const fullSapData = await fetchClientByCode(cardCode);
        if (fullSapData) {
          const fullAdapted = adaptClientFromApi(fullSapData);
          const fullNormalizedClient = normalizeQuoteClient({
            ...fullSapData,
            CardCode: fullAdapted.id || fullSapData.CardCode || cardCode,
            CardName: fullAdapted.firstName || fullSapData.CardName || initialClient.CardName,
            Address: fullAdapted.address || fullSapData.Address || initialClient.Address,
            ContactEmployees: fullSapData.ContactEmployees || fullAdapted.contactEmployees || [],
            ContactPerson: fullSapData.ContactPerson || fullAdapted.contactPerson || null,
            raw: fullSapData,
          });
          setClient(fullNormalizedClient);
        }
      } catch (err) {
        console.warn("No se pudieron cargar detalles adicionales de SAP:", err);
      }
    }
  };

  const handleClear = () => {
    setClient(null);
    setSearchInput("");
    setSearchTerm("");
    setFallbackResults([]);
  };

  // 1. VISTA CUANDO EL CLIENTE YA ESTÁ SELECCIONADO
  if (client) {
    const normalizedClient = normalizeQuoteClient(client) || client;
    const cardCode = normalizedClient.CardCode || "No registrado";
    const documentNumber = normalizedClient.LicTradNum || normalizedClient.clientRuc || "No registrado";
    return (
      <Box
        p={4}
        bg="emerald.50"
        borderRadius="xl"
        border="2px solid"
        borderColor="emerald.400"
        boxShadow="0 4px 15px rgba(16, 185, 129, 0.12)"
        position="relative"
      >
        <Button
          size="xs"
          position="absolute"
          top={3}
          right={3}
          colorScheme="red"
          variant="ghost"
          borderRadius="full"
          onClick={handleClear}
          leftIcon={<FiX />}
        >
          Cambiar Cliente
        </Button>

        <HStack spacing={2} mb={1.5}>
          <Badge bg="emerald.700" color="white" px={2.5} py={0.5} borderRadius="full" fontSize="10px" fontWeight="700">
            Cliente SAP Seleccionado
          </Badge>
        </HStack>

        <Text fontWeight="800" fontSize="md" color="emerald.950" mb={1}>
          {normalizedClient.CardName || "Cliente seleccionado"}
        </Text>

        {(normalizedClient.CardCode || normalizedClient.LicTradNum) && (
          <Text fontSize="xs" color="gray.700" mb={0.5}>
            <strong>Código SAP:</strong> {cardCode} <strong>• RUC / Doc:</strong> {documentNumber}
          </Text>
        )}

        {normalizedClient.Address && (
          <Text fontSize="xs" color="gray.700" isTruncated title={normalizedClient.Address}>
            <strong>Dirección:</strong> {normalizedClient.Address}
          </Text>
        )}
      </Box>
    );
  }

  const is404OrEmpty =
    !isSearching &&
    searchTerm &&
    ((isSearchingByCode && !dataByCode) || (!isSearchingByCode && activeNameList.length === 0));

  // 2. BUSCADOR ÚNICO INTELIGENTE SAP (Diseño Compacto y Elegante)
  return (
    <Box w="full" maxW={{ base: "full", md: "560px" }}>
      <Box p={2.5} bg="#f0fdf4" borderRadius="lg" border="1.5px dashed #86efac">
        <Box fontSize="11px" fontWeight="900" color="#166534" mb={1} letterSpacing="wider" textTransform="uppercase">
          🔍 Búsqueda Inteligente de Cliente SAP
        </Box>
        <Flex gap={2} align="center">
          <Input
            flex="1"
            size="sm"
            borderRadius="md"
            placeholder="Escribe RUC, DNI o Razón Social..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            bg="white"
            borderColor="#cbd5e1"
            fontSize="xs"
            fontWeight="600"
            _focus={{ borderColor: "#16a34a", boxShadow: "0 0 0 1px #16a34a" }}
          />
          <Button
            size="sm"
            colorScheme="green"
            bg="#0d6334"
            _hover={{ bg: "#166534" }}
            px={3.5}
            onClick={triggerSearch}
            isLoading={isSearching}
            leftIcon={<FiSearch />}
            fontSize="xs"
            fontWeight="800"
            flexShrink={0}
          >
            Buscar
          </Button>
        </Flex>
      </Box>

      {/* ESTADO DE CARGA */}
      {isSearching && (
        <Flex justify="center" py={4} bg="white" mt={2} borderRadius="md" shadow="sm">
          <Spinner color="emerald.600" size="sm" />
          <Text fontSize="xs" color="gray.600" ml={2}>Consultando socio de negocio en SAP...</Text>
        </Flex>
      )}

      {/* MENSAJE SIN RESULTADOS */}
      {is404OrEmpty && (
        <Box p={3} bg="amber.50" borderRadius="md" border="1px solid" borderColor="amber.300" mt={2}>
          <Text color="amber.900" fontSize="xs" fontWeight="700">
            Socio de negocio no encontrado en SAP
          </Text>
          <Text color="amber.800" fontSize="0.7rem" mt={0.5}>
            No se encontraron coincidencias en SAP para la búsqueda ingresada.
          </Text>
        </Box>
      )}

      {/* RESULTADO ÚNICO POR CÓDIGO / RUC / DNI */}
      {!isSearching && isSearchingByCode && dataByCode && !client && (
        <Box
          mt={2}
          p={3}
          bg="emerald.50"
          borderRadius="md"
          border="1px solid"
          borderColor="emerald.300"
          cursor="pointer"
          onClick={() => handleSelectClient(dataByCode)}
          _hover={{ bg: "emerald.100" }}
          shadow="sm"
        >
          <HStack justify="space-between">
            <Text fontWeight="800" fontSize="xs" color="emerald.900">
              {dataByCode.CardName || dataByCode.firstName}
            </Text>
            <Badge colorScheme="emerald" fontSize="0.65rem">SAP</Badge>
          </HStack>
          <Text fontSize="0.75rem" color="gray.600" fontWeight="700">
            Código: {dataByCode.CardCode || dataByCode.id}
          </Text>
          <Text fontSize="0.7rem" color="gray.600">
            {dataByCode.Address || dataByCode.address || "Sin dirección registrada"}
          </Text>
        </Box>
      )}

      {/* LISTA DE RESULTADOS POR NOMBRE / RAZÓN SOCIAL */}
      {!isSearching && !isSearchingByCode && activeNameList.length > 0 && !client && (
        <VStack spacing={1.5} maxH="220px" overflowY="auto" mt={2} p={1} bg="white" borderRadius="md" shadow="lg" border="1px solid" borderColor="gray.200">
          {activeNameList.map((clientData, idx) => {
            const adapted = adaptClientFromApi(clientData);
            const cardCode = adapted.id || clientData.CardCode || clientData.cardCode;
            const cardName = adapted.firstName || clientData.CardName || clientData.clientName;
            const address = adapted.address || clientData.Address || clientData.address || "Sin dirección";

            return (
              <Box
                key={cardCode || idx}
                w="100%"
                p={2.5}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                cursor="pointer"
                onClick={() => handleSelectClient(clientData)}
                _hover={{ bg: "emerald.50", borderColor: "emerald.300" }}
              >
                <HStack justify="space-between">
                  <Text fontWeight="700" fontSize="xs" color="emerald.900" isTruncated maxW="240px">
                    {cardName}
                  </Text>
                  <Badge colorScheme="emerald" fontSize="0.65rem">
                    {cardCode}
                  </Badge>
                </HStack>
                <Text fontSize="0.7rem" color="gray.500" isTruncated>
                  {address}
                </Text>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}
