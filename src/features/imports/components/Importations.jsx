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
import { Search, Calendar, Package, Hash, Tag } from "lucide-react";

const PAGE_SIZE = 5;

export function Importations({ data = [], isLoading, error, onRetry }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Colores temáticos
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgHover = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const bgAccordion = useColorModeValue("gray.50", "gray.900");

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!search) return data;

    const q = search.toLowerCase();

    return data.filter(item => {
      return (
        item.linea?.toLowerCase().includes(q) ||
        item.itemCode?.toLowerCase().includes(q) ||
        item.itemDescription?.toLowerCase().includes(q) ||
        String(item.nroImportacion).includes(q)
      );
    });
  }, [data, search]);

  // Agrupar por línea
  const groupedByLine = useMemo(() => {
    const map = new Map();

    filteredData.forEach(item => {
      const lineKey = item.linea || "Sin línea";
      
      if (!map.has(lineKey)) {
        map.set(lineKey, {
          linea: lineKey,
          products: []
        });
      }
      map.get(lineKey).products.push(item);
    });

    // Convertir a array y ordenar por cantidad de productos
    return Array.from(map.values()).sort((a, b) => b.products.length - a.products.length);
  }, [filteredData]);

  const totalPages = Math.ceil(groupedByLine.length / PAGE_SIZE);
  
  const paginatedLines = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return groupedByLine.slice(start, start + PAGE_SIZE);
  }, [groupedByLine, page]);

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
            leftIcon={<Icon as={Search} />}
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
          <Package size={32} color="#CBD5E0" />
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
            <Search size={16} color="#A0AEC0" />
          </InputLeftElement>
          <Input
            placeholder="Buscar por línea, código, descripción o nro. importación..."
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

      {/* 📦 Vista de líneas agrupadas */}
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="medium" color={textMuted}>
          Líneas en importación ({groupedByLine.length})
        </Text>
        <Badge colorScheme="blue" fontSize="xs">
          Agrupado por línea/marca
        </Badge>
      </HStack>

      <Accordion allowMultiple reduceMotion>
        {paginatedLines.map(line => {
          const totalQuantity = line.products.reduce((sum, product) => sum + product.quantity, 0);
          const totalValue = line.products.reduce((sum, product) => sum + product.valorPedido, 0);
          
          return (
            <AccordionItem
              key={line.linea}
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
                    <VStack align="flex-start" spacing={1}>
                      <HStack spacing={2}>
                        <Badge
                          colorScheme="purple"
                          fontSize="md"
                          px={3}
                          py={1}
                          borderRadius="md"
                          fontWeight="bold"
                        >
                          <HStack spacing={1}>
                            <Tag size={14} />
                            <Text>{line.linea}</Text>
                          </HStack>
                        </Badge>
                        <Badge
                          fontSize="xs"
                          variant="outline"
                          colorScheme="blue"
                        >
                          {line.products.length} producto{line.products.length !== 1 ? 's' : ''}
                        </Badge>
                      </HStack>
                    </VStack>
                    
                    <HStack spacing={3}>
                      <VStack spacing={0} align="flex-end">
                        <Text fontSize="xs" color={textMuted}>
                          Cantidad total
                        </Text>
                        <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                          {totalQuantity}
                        </Badge>
                      </VStack>
                      <VStack spacing={0} align="flex-end">
                        <Text fontSize="xs" color={textMuted}>
                          Valor total
                        </Text>
                        <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                          ${totalValue.toFixed(2)}
                        </Badge>
                      </VStack>
                      <AccordionIcon />
                    </HStack>
                  </HStack>
                </Box>
              </AccordionButton>

              <AccordionPanel px={4} py={3} bg={bgAccordion}>
                <VStack spacing={3} align="stretch">
                  {line.products.map((product, idx) => (
                    <Box
                      key={`${product.itemCode}-${idx}`}
                      p={3}
                      bg={bgCard}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                      _hover={{ borderColor: "blue.300" }}
                      transition="border-color 0.2s"
                    >
                      <HStack justify="space-between" mb={2}>
                        <HStack spacing={2} flex="1" flexWrap="wrap">
                          <Badge
                            colorScheme="blue"
                            fontSize="xs"
                            px={2}
                            py={1}
                            borderRadius="md"
                          >
                            {product.itemCode}
                          </Badge>
                          <Badge
                            fontSize="xs"
                            px={2}
                            py={1}
                            colorScheme="purple"
                            variant="outline"
                            borderRadius="md"
                          >
                            Imp. #{product.nroImportacion}
                          </Badge>
                          {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const arrivalDate = new Date(product.fechaIngreso);
                            arrivalDate.setHours(0, 0, 0, 0);
                            const hasArrived = today >= arrivalDate;
                            
                            return (
                              <Badge
                                fontSize="xs"
                                px={2}
                                py={1}
                                colorScheme={hasArrived ? "green" : "orange"}
                                variant="solid"
                                borderRadius="md"
                              >
                                {hasArrived ? "✓ Ya arribó" : "🚢 En importación"}
                              </Badge>
                            );
                          })()}
                        </HStack>
                        
                        <HStack spacing={1}>
                          <Calendar size={12} color="#718096" />
                          <Text fontSize="xs" color={textMuted}>
                            {new Date(product.fechaIngreso).toLocaleDateString()}
                          </Text>
                        </HStack>
                      </HStack>

                      <Text fontSize="sm" mb={2} fontWeight="medium">
                        {product.itemDescription}
                      </Text>

                      <Divider my={2} />

                      <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                        <GridItem>
                          <Text fontSize="xs" color={textMuted}>
                            Cantidad:
                          </Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.600">
                            {product.quantity}
                          </Text>
                        </GridItem>
                        
                        <GridItem>
                          <Text fontSize="xs" color={textMuted}>
                            Valor pedido:
                          </Text>
                          <Text fontSize="sm" fontWeight="bold" color="orange.600">
                            ${product.valorPedido.toFixed(2)}
                          </Text>
                        </GridItem>
                        
                        <GridItem>
                          <Text fontSize="xs" color={textMuted}>
                            Precio unit.:
                          </Text>
                          <Text fontSize="sm" fontWeight="medium">
                            ${(product.valorPedido / product.quantity).toFixed(2)}
                          </Text>
                        </GridItem>
                      </Grid>
                    </Box>
                  ))}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Paginación */}
      {groupedByLine.length > PAGE_SIZE && (
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
              leftIcon={<Icon as={Hash} />}
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
                ({groupedByLine.length} líneas)
              </Text>
            </HStack>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              isDisabled={page === totalPages}
              rightIcon={<Icon as={Hash} />}
            >
              Siguiente
            </Button>
          </HStack>
        </Box>
      )}
    </VStack>
  );
}