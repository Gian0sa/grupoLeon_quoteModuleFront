import {
  Box,
  Text,
  VStack,
  HStack,
  Stack,
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
  useColorModeValue
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { Search, Calendar, Package, Tag } from "lucide-react";
import { GiCargoShip } from "react-icons/gi";

const PAGE_SIZE = 5;

export function Importations({ data = [], isLoading, error, onRetry }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgHover = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const bgAccordion = useColorModeValue("gray.50", "gray.900");

  const filteredData = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();

    return data.filter(item =>
      item.linea?.toLowerCase().includes(q) ||
      item.itemCode?.toLowerCase().includes(q) ||
      item.itemDescription?.toLowerCase().includes(q) ||
      String(item.nroImportacion).includes(q)
    );
  }, [data, search]);

  const groupedByLine = useMemo(() => {
    const map = new Map();

    filteredData.forEach(item => {
      const key = item.linea || "Sin línea";
      if (!map.has(key)) {
        map.set(key, { linea: key, products: [] });
      }
      map.get(key).products.push(item);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.products.length - a.products.length
    );
  }, [filteredData]);

  const totalPages = Math.ceil(groupedByLine.length / PAGE_SIZE);
  const paginatedLines = groupedByLine.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (isLoading) {
    return (
      <VStack py={10}>
        <Spinner size="lg" />
        <Text color={textMuted}>Cargando importaciones...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack py={10}>
        <Text color="red.500">Error al cargar importaciones</Text>
        {onRetry && (
          <Button onClick={onRetry} leftIcon={<Search size={16} />}>
            Reintentar
          </Button>
        )}
      </VStack>
    );
  }

  if (!data.length) {
    return (
      <VStack py={12}>
        <Package size={32} />
        <Text color={textMuted}>No hay importaciones</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <Search size={16} />
        </InputLeftElement>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          bg={bgCard}
        />
      </InputGroup>

      <Accordion allowToggle reduceMotion>
        {paginatedLines.map(line => {
          const totalQuantity = line.products.reduce(
            (sum, p) => sum + p.quantity,
            0
          );

          return (
            <AccordionItem
              key={line.linea}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="lg"
              mb={3}
            >
              <AccordionButton _hover={{ bg: bgHover }}>
                <Box flex="1" textAlign="left">
                  <HStack justify="space-between">
                    <HStack>
                      <Badge colorScheme="purple">
                        <HStack spacing={1}>
                          <Tag size={12} />
                          <Text>{line.linea}</Text>
                        </HStack>
                      </Badge>
                      <Badge variant="outline">
                        {line.products.length} prod.
                      </Badge>
                    </HStack>

                    <HStack>
                      <Badge colorScheme="green">
                        Total: {totalQuantity}
                      </Badge>
                      <AccordionIcon />
                    </HStack>
                  </HStack>
                </Box>
              </AccordionButton>

              <AccordionPanel bg={bgAccordion}>
                <VStack spacing={2} align="stretch">
                  {line.products.map((product, idx) => {
                    const today = new Date().setHours(0, 0, 0, 0);
                    const arrival = new Date(product.fechaIngreso).setHours(
                      0, 0, 0, 0
                    );
                    const hasArrived = today >= arrival;

                    return (
                      <Box
                        key={`${product.itemCode}-${idx}`}
                        p={3}
                        bg={bgCard}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="md"
                      >
                        <HStack spacing={3} align="flex-start">
                          {/* ICONO */}
                          <Box
                            p={1.5}
                            borderRadius="md"
                            bg={hasArrived ? "green.50" : "blue.50"}
                          >
                            <Icon
                              as={hasArrived ? Package : GiCargoShip}
                              boxSize={6}
                              color={hasArrived ? "green.600" : "blue.600"}
                            />
                          </Box>

                          {/* CONTENIDO */}
                          <HStack w="full" justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Text fontSize="xs" fontWeight="bold">
                                {product.itemCode}
                              </Text>
                              <Text fontSize="sm" color={textMuted}>
                                {product.itemDescription}
                              </Text>
                            </VStack>

                            <VStack align="end" spacing={1}>
                              <Text
                                fontSize="xl"
                                fontWeight="extrabold"
                                color={hasArrived ? "green.600" : "orange.600"}
                              >
                                {product.quantity}
                              </Text>
                              <HStack spacing={1}>
                                <Calendar size={14} />
                                <Text fontSize="sm" color={textMuted}>
                                  {new Date(product.fechaIngreso).toLocaleDateString("es-PE", {
                                    day: "2-digit",
                                    month: "short"
                                  })}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>

      {groupedByLine.length > PAGE_SIZE && (
        <HStack justify="space-between">
          <Button
            size="sm"
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            isDisabled={page === 1}
          >
            Anterior
          </Button>

          <Text fontSize="xs">
            {page} / {totalPages}
          </Text>

          <Button
            size="sm"
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            isDisabled={page === totalPages}
          >
            Siguiente
          </Button>
        </HStack>
      )}
    </VStack>
  );
}
