import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Button,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Grid,
  GridItem,
  Divider,
  useColorModeValue
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { SearchIcon, CalendarIcon, PackageIcon, HashIcon } from "lucide-react";

const PAGE_SIZE = 5;

export function ImportationsTab({ data = [], isLoading, error, onRetry }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Colores temáticos
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgHover = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const bgAccordion = useColorModeValue("gray.50", "gray.900");

  // Extraer código comercial de la descripción
  function getCommercialCode(description = "") {
    return description.split(" ")[0]?.toUpperCase() || "";
  }

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!search) return data;

    const q = search.toLowerCase();

    return data.filter(item => {
      const commercialCode = getCommercialCode(item.itemDescription).toLowerCase();

      return (
        commercialCode.includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.itemDescription.toLowerCase().includes(q) ||
        String(item.docNum).includes(q)
      );
    });
  }, [data, search]);

  // Agrupar por orden de compra
  const groupedOrders = useMemo(() => {
    const map = new Map();

    filteredData.forEach(item => {
      if (!map.has(item.docEntry)) {
        map.set(item.docEntry, {
          docEntry: item.docEntry,
          docNum: item.docNum,
          cardName: item.cardName,
          fechaArribo: item.fechaArribo,
          lines: []
        });
      }
      map.get(item.docEntry).lines.push(item);
    });

    return Array.from(map.values());
  }, [filteredData]);

  const totalPages = Math.ceil(groupedOrders.length / PAGE_SIZE);
  
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return groupedOrders.slice(start, start + PAGE_SIZE);
  }, [groupedOrders, page]);

  // Estados de carga y error
  if (isLoading) {
    return (
      <VStack spacing={4} py={10} align="center" justify="center">
        <Spinner size="lg" color="blue.500" thickness="3px" />
        <Text color={textMuted}>Cargando importaciones...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10} px={4}>
        <Box
          p={6}
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
          borderRadius="lg"
          mb={4}
        >
          <Text color="red.600" fontWeight="medium" mb={2}>
            Error al cargar importaciones
          </Text>
          <Text fontSize="sm" color="red.500">
            {error.message || "No se pudieron cargar los datos"}
          </Text>
        </Box>
        {onRetry && (
          <Button
            colorScheme="red"
            variant="outline"
            onClick={onRetry}
            leftIcon={<Icon as={SearchIcon} />}
          >
            Reintentar
          </Button>
        )}
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box textAlign="center" py={12} px={4}>
        <Box
          display="inline-flex"
          p={4}
          bg={bgAccordion}
          borderRadius="full"
          mb={4}
        >
          <PackageIcon size={32} color="#CBD5E0" />
        </Box>
        <Text fontSize="lg" fontWeight="medium" color={textMuted} mb={2}>
          No hay importaciones
        </Text>
        <Text fontSize="sm" color={textMuted}>
          No se encontraron órdenes de importación registradas
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* 🔍 Barra de búsqueda */}
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2} color={textMuted}>
          Buscar importaciones
        </Text>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none">
            <SearchIcon size={16} color="#A0AEC0" />
          </InputLeftElement>
          <Input
            placeholder="Buscar por código, descripción, OC o proveedor..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            bg={bgCard}
            borderColor={borderColor}
            _hover={{ borderColor: "blue.300" }}
            _focus={{
              borderColor: "blue.500",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
            }}
          />
        </InputGroup>
      </Box>

      {/* 🔍 Vista de productos (modo búsqueda) */}
      {search && (
        <Box>
          <HStack justify="space-between" mb={4}>
            <Text fontSize="sm" fontWeight="medium" color={textMuted}>
              Resultados de búsqueda ({filteredData.length})
            </Text>
            <Badge colorScheme="blue" fontSize="xs">
              Vista producto
            </Badge>
          </HStack>

          <VStack spacing={3} align="stretch">
            {filteredData.map(item => {
              const commercialCode = getCommercialCode(item.itemDescription);

              return (
                <Box
                  key={`${item.docEntry}-${item.lineNum}`}
                  p={4}
                  bg={bgCard}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="lg"
                  _hover={{ bg: bgHover, borderColor: "blue.300" }}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between" mb={3}>
                    <Badge
                      colorScheme="blue"
                      fontSize="xs"
                      px={2}
                      py={1}
                      borderRadius="md"
                    >
                      {commercialCode}
                    </Badge>
                    
                    <Badge
                      fontSize="xs"
                      px={2}
                      py={1}
                      colorScheme={item.lineStatus === "bost_Close" ? "green" : "orange"}
                      variant="solid"
                      borderRadius="md"
                    >
                      {item.lineStatus === "bost_Close" ? "En camino" : "Pendiente"}
                    </Badge>
                  </HStack>

                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    {item.itemDescription.replace(commercialCode, "").trim()}
                  </Text>

                  <Grid templateColumns="repeat(2, 1fr)" gap={3} mt={4}>
                    <GridItem>
                      <HStack spacing={1}>
                        <CalendarIcon size={12} color="#718096" />
                        <Text fontSize="xs" color={textMuted}>
                          Arribo: {new Date(item.fechaArribo).toLocaleDateString()}
                        </Text>
                      </HStack>
                    </GridItem>
                    
                    <GridItem>
                      <HStack spacing={1}>
                        <HashIcon size={12} color="#718096" />
                        <Text fontSize="xs" color={textMuted}>
                          OC: {item.docNum}
                        </Text>
                      </HStack>
                    </GridItem>
                    
                    <GridItem>
                      <Text fontSize="xs" color={textMuted}>
                        Cantidad: <Text as="span" fontWeight="bold">{item.quantity}</Text>
                      </Text>
                    </GridItem>
                    
                    <GridItem>
                      <Text fontSize="xs" color={textMuted}>
                        SAP: {item.itemCode}
                      </Text>
                    </GridItem>
                  </Grid>
                </Box>
              );
            })}
          </VStack>
        </Box>
      )}

      {/* 📦 Vista de órdenes (modo normal) */}
      {!search && (
        <>
          <HStack justify="space-between" align="center">
            <Text fontSize="sm" fontWeight="medium" color={textMuted}>
              Órdenes de importación ({groupedOrders.length})
            </Text>
            <Badge colorScheme="purple" fontSize="xs">
              Vista agrupada
            </Badge>
          </HStack>

          <Accordion allowMultiple reduceMotion>
            {paginatedOrders.map(order => (
              <AccordionItem
                key={order.docEntry}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="lg"
                mb={3}
                overflow="hidden"
                _hover={{ borderColor: "blue.300" }}
                transition="border-color 0.2s"
              >
                <AccordionButton
                  px={4}
                  py={3}
                  _hover={{ bg: bgHover }}
                  transition="background 0.2s"
                >
                  <Box flex="1" textAlign="left">
                    <HStack justify="space-between" align="flex-start" mb={1}>
                      <VStack align="flex-start" spacing={0}>
                        <HStack spacing={2}>
                          <Badge
                            colorScheme="purple"
                            fontSize="xs"
                            px={2}
                            py={1}
                            borderRadius="md"
                          >
                            OC #{order.docNum}
                          </Badge>
                          <Badge
                            fontSize="xs"
                            variant="outline"
                            colorScheme="gray"
                          >
                            {order.lines.length} productos
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color={textMuted} mt={1}>
                          Proveedor: {order.cardName}
                        </Text>
                      </VStack>
                      
                      <HStack spacing={2}>
                        <HStack spacing={1}>
                          <CalendarIcon size={12} color="#718096" />
                          <Text fontSize="xs" color={textMuted}>
                            {new Date(order.fechaArribo).toLocaleDateString()}
                          </Text>
                        </HStack>
                        <AccordionIcon />
                      </HStack>
                    </HStack>
                  </Box>
                </AccordionButton>

                <AccordionPanel px={4} py={3} bg={bgAccordion}>
                  <VStack spacing={3} align="stretch">
                    {order.lines.map(line => {
                      const commercialCode = getCommercialCode(line.itemDescription);

                      return (
                        <Box
                          key={`${line.docEntry}-${line.lineNum}`}
                          p={3}
                          bg={bgCard}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={borderColor}
                          _hover={{ borderColor: "blue.300" }}
                          transition="border-color 0.2s"
                        >
                          <HStack justify="space-between" mb={2}>
                            <Badge
                              colorScheme="blue"
                              fontSize="xs"
                              px={2}
                              py={1}
                              borderRadius="md"
                            >
                              {commercialCode}
                            </Badge>
                            
                            <Badge
                              fontSize="xs"
                              px={2}
                              py={1}
                              colorScheme={line.lineStatus === "bost_Close" ? "green" : "orange"}
                              variant={line.lineStatus === "bost_Close" ? "solid" : "subtle"}
                              borderRadius="md"
                            >
                              {line.lineStatus === "bost_Close" ? "Completado" : "Pendiente"}
                            </Badge>
                          </HStack>

                          <Text fontSize="sm" mb={2}>
                            {line.itemDescription.replace(commercialCode, "").trim()}
                          </Text>

                          <Divider my={2} />

                          <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                            <GridItem>
                              <Text fontSize="xs" color={textMuted}>
                                Cantidad:
                              </Text>
                              <Text fontSize="sm" fontWeight="bold">
                                {line.quantity}
                              </Text>
                            </GridItem>
                            
                            <GridItem>
                              <Text fontSize="xs" color={textMuted}>
                                Código SAP:
                              </Text>
                              <Text fontSize="xs" fontFamily="mono">
                                {line.itemCode}
                              </Text>
                            </GridItem>
                          </Grid>
                        </Box>
                      );
                    })}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Paginación */}
          {groupedOrders.length > PAGE_SIZE && (
            <Box
              p={4}
              bg={bgAccordion}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
            >
              <HStack justify="space-between" align="center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  isDisabled={page === 1}
                  leftIcon={<Icon as={HashIcon} />}
                >
                  Anterior
                </Button>

                <HStack spacing={2}>
                  <Text fontSize="sm" color={textMuted}>
                    Página
                  </Text>
                  <Badge colorScheme="blue" px={3} py={1}>
                    {page} de {totalPages}
                  </Badge>
                  <Text fontSize="sm" color={textMuted}>
                    ({groupedOrders.length} órdenes)
                  </Text>
                </HStack>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  isDisabled={page === totalPages}
                  rightIcon={<Icon as={HashIcon} />}
                >
                  Siguiente
                </Button>
              </HStack>
            </Box>
          )}
        </>
      )}
    </VStack>
  );
}