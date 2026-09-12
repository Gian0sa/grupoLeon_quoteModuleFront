import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Flex, Input, Button, Text, VStack, HStack, Spinner, Badge
} from "@chakra-ui/react";
import { FiSearch, FiX, FiCheckCircle } from "react-icons/fi";
import { useClientQueries, useClientQueriesByName } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";
import { fetchClientByCode } from "../../clients/services/clientService";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { normalizeQuoteClient } from "../stores/quoteStore";

export default function ClientAutocomplete({ client, setClient }) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchingByCode, setIsSearchingByCode] = useState(false);

  // Debounce de 500ms para evitar saturar el Service Layer de SAP en cada pulsación
  const debouncedSearchInput = useDebounce(searchInput, 500);

  useEffect(() => {
    const trimmed = debouncedSearchInput.trim();
    if (!trimmed) {
      setSearchTerm("");
      return;
    }

    const isNumeric = /^\d+$/.test(trimmed) || /^CL/i.test(trimmed);

    // Buenas prácticas ERP: No enviar búsquedas de 1 o 2 letras a SAP (provocan escaneo masivo de miles de clientes)
    if (!isNumeric && trimmed.length < 3) {
      return;
    }
    if (isNumeric && /^\d+$/.test(trimmed) && trimmed.length < 4) {
      return;
    }

    setIsSearchingByCode(isNumeric);

    let finalTerm = trimmed;
    if (isNumeric && /^\d+$/.test(trimmed)) {
      finalTerm = `CL${trimmed}`;
    }

    setSearchTerm(finalTerm);
  }, [debouncedSearchInput]);

  const { data: dataByCode, isLoading: isLoadingByCode, error: errorByCode } =
    useClientQueries(isSearchingByCode && searchTerm ? searchTerm : null);

  const { data: dataByName, isLoading: isLoadingByName, error: errorByName } =
    useClientQueriesByName(!isSearchingByCode && searchTerm ? searchTerm : null);

  const isSearching = isSearchingByCode ? isLoadingByCode : isLoadingByName;
  const searchError = isSearchingByCode ? errorByCode : errorByName;

  // Extracción de la lista de clientes SAP
  const activeNameList = useMemo(() => {
    if (!dataByName) return [];
    if (Array.isArray(dataByName.value)) return dataByName.value;
    if (Array.isArray(dataByName.clients)) return dataByName.clients;
    if (Array.isArray(dataByName.clients?.clients)) return dataByName.clients.clients;
    if (Array.isArray(dataByName)) return dataByName;
    return [];
  }, [dataByName]);

  const triggerSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed || trimmed.length < 2) return;

    const isNumeric = /^\d+$/.test(trimmed) || /^CL/i.test(trimmed);
    setIsSearchingByCode(isNumeric);

    let finalTerm = trimmed;
    if (isNumeric && /^\d+$/.test(trimmed)) {
      finalTerm = `CL${trimmed}`;
    }

    setSearchTerm(finalTerm);
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
  };

  // 1. VISTA CUANDO EL CLIENTE YA ESTÁ SELECCIONADO
  if (client) {
    const normalizedClient = normalizeQuoteClient(client) || client;
    const cardCode = normalizedClient.CardCode || "No registrado";
    const documentNumber = normalizedClient.LicTradNum || normalizedClient.clientRuc || "No registrado";
    return (
      <Box
        p={{ base: 3, md: 4 }}
        bg="emerald.50"
        borderRadius="xl"
        border="2px solid"
        borderColor="emerald.400"
        boxShadow="0 4px 15px rgba(16, 185, 129, 0.12)"
        w="full"
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
          <Badge bg="emerald.700" color="white" px={2.5} py={0.5} borderRadius="full" fontSize="10px" fontWeight="700">
            Cliente SAP Seleccionado
          </Badge>
          <Button
            size="xs"
            colorScheme="red"
            variant="ghost"
            borderRadius="full"
            onClick={handleClear}
            leftIcon={<FiX />}
            fontWeight="700"
          >
            Cambiar Cliente
          </Button>
        </Flex>

        <Text fontWeight="800" fontSize={{ base: "sm", md: "md" }} color="emerald.950" mb={1} wordBreak="break-word">
          {normalizedClient.CardName || "Cliente seleccionado"}
        </Text>

        {(normalizedClient.CardCode || normalizedClient.LicTradNum) && (
          <Text fontSize="xs" color="gray.700" mb={0.5} wordBreak="break-word">
            <strong>Código SAP:</strong> {cardCode} <strong>• RUC / Doc:</strong> {documentNumber}
          </Text>
        )}

        {normalizedClient.Address && (
          <Text fontSize="xs" color="gray.700" wordBreak="break-word" title={normalizedClient.Address}>
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
    <Box w="full">
      <Box p={{ base: 2, md: 2.5 }} bg="#f0fdf4" borderRadius="lg" border="1.5px dashed #86efac">
        <Box fontSize="11px" fontWeight="900" color="#166534" mb={1.5} letterSpacing="wider" textTransform="uppercase">
          🔍 Búsqueda Inteligente de Cliente SAP
        </Box>
        <Flex gap={2} align="center">
          <Input
            flex="1"
            minW="0"
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
            bg="#0d6334"
            color="white"
            _hover={{ bg: "#166534" }}
            _active={{ bg: "#14532d" }}
            px={3.5}
            onClick={triggerSearch}
            leftIcon={isSearching ? <Spinner size="xs" color="white" speed="0.6s" /> : <FiSearch size={14} />}
            fontSize="xs"
            fontWeight="800"
            flexShrink={0}
            boxShadow="sm"
          >
            Buscar
          </Button>
        </Flex>
      </Box>

      {/* INDICADOR DE BÚSQUEDA EN CURSO */}
      {isSearching && (
        <Flex align="center" gap={2} mt={1.5} px={2.5} py={1.5} bg="emerald.50" borderRadius="md" border="1px solid" borderColor="emerald.200">
          <Spinner color="#16a34a" size="xs" speed="0.6s" flexShrink={0} />
          <Text fontSize="11px" color="#166534" fontWeight="700" isTruncated>
            Consultando "{searchTerm || searchInput.trim()}" en SAP Business One...
          </Text>
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
          <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} wrap="wrap" gap={1.5} mb={1}>
            <Text fontWeight="800" fontSize="xs" color="emerald.900" flex="1" minW="140px" wordBreak="break-word">
              {dataByCode.CardName || dataByCode.firstName}
            </Text>
            <Badge colorScheme="emerald" fontSize="0.65rem" flexShrink={0}>SAP</Badge>
          </Flex>
          <Text fontSize="0.75rem" color="gray.600" fontWeight="700">
            Código: {dataByCode.CardCode || dataByCode.id}
          </Text>
          <Text fontSize="0.7rem" color="gray.600" wordBreak="break-word">
            {dataByCode.Address || dataByCode.address || "Sin dirección registrada"}
          </Text>
        </Box>
      )}

      {/* LISTA DE RESULTADOS POR NOMBRE / RAZÓN SOCIAL */}
      {!isSearching && !isSearchingByCode && activeNameList.length > 0 && !client && (
        <VStack spacing={1.5} maxH="240px" overflowY="auto" mt={2} p={1} bg="white" borderRadius="md" shadow="lg" border="1px solid" borderColor="gray.200" align="stretch">
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
                transition="all 0.15s ease"
              >
                <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} wrap="wrap" gap={1.5} mb={0.5}>
                  <Text fontWeight="700" fontSize="xs" color="emerald.900" flex="1" minW="150px" wordBreak="break-word">
                    {cardName}
                  </Text>
                  <Flex gap={1} align="center" flexShrink={0} wrap="wrap">
                    {clientData.FederalTaxID && (
                      <Badge colorScheme="purple" fontSize="0.65rem" px={1.5} py={0.5} borderRadius="sm">
                        {clientData.FederalTaxID}
                      </Badge>
                    )}
                    <Badge colorScheme="emerald" fontSize="0.65rem" px={1.5} py={0.5} borderRadius="sm">
                      {cardCode}
                    </Badge>
                  </Flex>
                </Flex>
                <Text fontSize="0.7rem" color="gray.500" noOfLines={2} wordBreak="break-word">
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
