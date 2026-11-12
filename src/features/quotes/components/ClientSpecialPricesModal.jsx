import React, { useState, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Button,
  HStack,
  VStack,
  Flex,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
} from "@chakra-ui/react";
import { Search, X, Star, Building2, Plus, Check } from "lucide-react";
import { formatThousands } from "../../../shared/utils/quoteCalculator";

/** Normaliza texto para búsqueda insensible a acentos y mayúsculas */
function cleanTerm(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function ClientSpecialPricesModal({
  isOpen,
  onClose,
  specialPricesList = [],
  clientName = "",
  cardCode = "",
  onSelectSpecialItem,
  currentProducts = [],
  currency = "USD",
  rateMultiplier = 1,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const toast = useToast();

  const isSol = currency === "PEN" || currency === "SOL";
  const currencySymbol = isSol ? "S/" : "$";

  // Identificar qué artículos ya están agregados en la cotización
  const addedItemCodes = useMemo(() => {
    const set = new Set();
    (currentProducts || []).forEach((p) => {
      const code = p.code || p.id || p.productCode || p.itemCode;
      if (code) set.add(String(code).trim().toUpperCase());
    });
    return set;
  }, [currentProducts]);

  // Filtrado reactivo por código, sigla o descripción
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return specialPricesList;
    const term = cleanTerm(searchTerm);
    return specialPricesList.filter((item) => {
      const c = cleanTerm(item.itemCode);
      const n = cleanTerm(item.itemName);
      const s = cleanTerm(item.sigla);
      return c.includes(term) || n.includes(term) || s.includes(term);
    });
  }, [specialPricesList, searchTerm]);

  const handleAdd = (item) => {
    if (!onSelectSpecialItem) return;
    onSelectSpecialItem(item);
    toast({
      title: "Artículo agregado",
      description: `${item.itemCode} agregado con precio de convenio (${item.discountPercent}% dto.)`,
      status: "success",
      duration: 2000,
      isClosable: true,
      position: "bottom-right",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="2xl">
        <ModalHeader bg="teal.700" color="white" py={3.5} px={5}>
          <Flex align="center" justify="space-between" pr={6}>
            <HStack spacing={2.5}>
              <Flex
                w="36px"
                h="36px"
                align="center"
                justify="center"
                borderRadius="xl"
                bg="whiteAlpha.200"
                color="yellow.300"
              >
                <Star size={20} fill="currentColor" />
              </Flex>
              <Box>
                <HStack spacing={2}>
                  <Text fontSize="md" fontWeight="900" letterSpacing="tight">
                    Catálogo de Precios Especiales por Convenio
                  </Text>
                  <Badge bg="yellow.400" color="yellow.950" fontSize="11px" fontWeight="900" px={2} py={0.5} borderRadius="full">
                    {specialPricesList.length} artículos
                  </Badge>
                </HStack>
                <Text fontSize="xs" fontWeight="600" color="teal.100">
                  {clientName ? `${clientName} • ` : ""}{cardCode} (Tabla OSPP SAP Business One)
                </Text>
              </Box>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="white" top={3.5} right={4} />

        <ModalBody p={4} bg="gray.50">
          {/* Barra de Filtro Rápido */}
          <Box mb={3}>
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <Search size={16} color="#0d9488" />
              </InputLeftElement>
              <Input
                placeholder="Filtrar por código, nombre o sigla de batería/filtro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg="white"
                borderRadius="lg"
                borderColor="gray.300"
                _focus={{ borderColor: "teal.600", boxShadow: "0 0 0 1px #0d9488" }}
                fontWeight="600"
                fontSize="xs"
              />
              {searchTerm && (
                <InputRightElement>
                  <IconButton
                    icon={<X size={14} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpiar filtro"
                  />
                </InputRightElement>
              )}
            </InputGroup>
          </Box>

          {/* Tabla de Artículos en Convenio */}
          {filteredList.length === 0 ? (
            <VStack py={10} spacing={2} bg="white" borderRadius="xl" border="1px dashed" borderColor="gray.300">
              <Building2 className="w-8 h-8 text-gray-400" />
              <Text fontSize="xs" fontWeight="700" color="gray.600">
                No se encontraron artículos de convenio coincidentes con "{searchTerm}".
              </Text>
            </VStack>
          ) : (
            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden" boxShadow="xs">
              <TableContainer maxH="440px" overflowY="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="teal.50" position="sticky" top={0} zIndex={1}>
                    <Tr>
                      <Th color="teal.900" fontSize="10px" fontWeight="900" py={2.5}>Artículo / Código</Th>
                      <Th color="teal.900" fontSize="10px" fontWeight="900" textAlign="center" py={2.5}>Stock</Th>
                      <Th color="teal.900" fontSize="10px" fontWeight="900" textAlign="right" py={2.5}>P. Lista</Th>
                      <Th color="teal.900" fontSize="10px" fontWeight="900" textAlign="center" py={2.5}>Dto. Convenio</Th>
                      <Th color="teal.900" fontSize="10px" fontWeight="900" textAlign="right" py={2.5}>Precio Pactado</Th>
                      <Th color="teal.900" fontSize="10px" fontWeight="900" textAlign="center" py={2.5}>Acción</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredList.map((sp) => {
                      const itemCodeClean = String(sp.itemCode || "").trim().toUpperCase();
                      const isAlreadyAdded = addedItemCodes.has(itemCodeClean);
                      const stockVal = sp.stock !== undefined && sp.stock !== null ? Number(sp.stock) : null;
                      const hasStock = stockVal !== null && stockVal > 0;

                      const listPrice = Number(sp.listPrice || 0) * rateMultiplier;
                      const specialPriceNeto = Number(sp.specialPrice || 0) * rateMultiplier;
                      const specialPriceConIGV = Number(sp.specialPriceConIGV || (specialPriceNeto * 1.18)) * rateMultiplier;

                      return (
                        <Tr key={sp.itemCode} _hover={{ bg: "teal.50" }} transition="background 0.15s">
                          <Td py={2}>
                            <VStack align="start" spacing={0.5}>
                              <Text fontSize="xs" fontWeight="800" color="gray.900" lineHeight="short">
                                {sp.itemName || sp.itemCode}
                              </Text>
                              <HStack spacing={1.5} wrap="wrap">
                                <Badge colorScheme="teal" fontSize="9px" fontWeight="800" px={1.5} py={0.2} borderRadius="sm">
                                  {sp.itemCode}
                                </Badge>
                                {sp.sigla && (
                                  <Badge bg="gray.100" color="gray.700" fontSize="9px" fontWeight="700" px={1.5} py={0.2} borderRadius="sm">
                                    {sp.sigla}
                                  </Badge>
                                )}
                              </HStack>
                            </VStack>
                          </Td>
                          <Td py={2} textAlign="center">
                            <Badge
                              colorScheme={hasStock ? "green" : "red"}
                              bg={hasStock ? "#16a34a" : "#dc2626"}
                              color="white"
                              fontSize="9px"
                              fontWeight="800"
                              px={1.5}
                              py={0.2}
                              borderRadius="sm"
                            >
                              {stockVal !== null ? (hasStock ? `Stk: ${stockVal}` : "STK: 0") : "Sin dato"}
                            </Badge>
                          </Td>
                          <Td py={2} textAlign="right">
                            <Text as="s" fontSize="xs" color="gray.500" fontWeight="600">
                              {currencySymbol}{formatThousands(listPrice.toFixed(2))}
                            </Text>
                          </Td>
                          <Td py={2} textAlign="center">
                            <Badge
                              bg="teal.600"
                              color="white"
                              fontSize="10px"
                              fontWeight="900"
                              px={2}
                              py={0.5}
                              borderRadius="md"
                            >
                              -{Number(sp.discountPercent || 0).toFixed(2)}%
                            </Badge>
                          </Td>
                          <Td py={2} textAlign="right">
                            <VStack align="flex-end" spacing={0}>
                              <Text fontSize="xs" fontWeight="900" color="#166534">
                                {currencySymbol}{formatThousands(specialPriceNeto.toFixed(2))} <Text as="span" fontSize="9px" color="gray.500">neto</Text>
                              </Text>
                              <Text fontSize="10px" fontWeight="700" color="teal.700">
                                {currencySymbol}{formatThousands(specialPriceConIGV.toFixed(2))} c/IGV
                              </Text>
                            </VStack>
                          </Td>
                          <Td py={2} textAlign="center">
                            <Button
                              size="xs"
                              h="28px"
                              px={2.5}
                              colorScheme={isAlreadyAdded ? "teal" : "green"}
                              bg={isAlreadyAdded ? "teal.600" : "#16a34a"}
                              _hover={{ bg: isAlreadyAdded ? "teal.700" : "#15803d" }}
                              color="white"
                              fontWeight="800"
                              fontSize="10px"
                              borderRadius="md"
                              leftIcon={isAlreadyAdded ? <Check size={12} /> : <Plus size={12} />}
                              onClick={() => handleAdd(sp)}
                              title={isAlreadyAdded ? "Ya está en la cotización. Haz clic para agregar otra unidad." : "Agregar a la cotización"}
                            >
                              {isAlreadyAdded ? "Agregado (+1)" : "Agregar"}
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </ModalBody>

        <ModalFooter bg="white" py={2.5} px={4} borderTop="1px solid" borderColor="gray.200">
          <Flex w="full" align="center" justify="space-between">
            <Text fontSize="11px" color="gray.600" fontWeight="600">
              💡 Precios y descuentos pactados directamente en SAP Business One para este cliente corporativo.
            </Text>
            <Button size="xs" h="30px" px={4} onClick={onClose} fontWeight="700" variant="outline" borderColor="gray.300">
              Cerrar
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ClientSpecialPricesModal;
