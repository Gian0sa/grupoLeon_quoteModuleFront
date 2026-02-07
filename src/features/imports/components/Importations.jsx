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
    <VStack spacing={4} align="stretch" w="full">
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
              <AccordionButton _hover={{ bg: bgHover }} px={3} py={3}>
                <Box flex="1" textAlign="left">
                  <Stack 
                    direction={{ base: "column", sm: "row" }}
                    justify="space-between"
                    spacing={2}
                    align={{ base: "flex-start", sm: "center" }}
                  >
                    <HStack flexWrap="wrap" spacing={2}>
                      <Badge colorScheme="purple" fontSize={{ base: "xs", sm: "sm" }}>
                        <HStack spacing={1}>
                          <Tag size={12} />
                          <Text isTruncated maxW={{ base: "120px", sm: "none" }}>
                            {line.linea}
                          </Text>
                        </HStack>
                      </Badge>
                      <Badge variant="outline" fontSize={{ base: "xs", sm: "sm" }}>
                        {line.products.length} prod.
                      </Badge>
                    </HStack>

                    <HStack spacing={2}>
                      <Badge colorScheme="green" fontSize={{ base: "xs", sm: "sm" }}>
                        Total: {totalQuantity}
                      </Badge>
                      <AccordionIcon />
                    </HStack>
                  </Stack>
                </Box>
              </AccordionButton>

              <AccordionPanel bg={bgAccordion} px={2} py={3}>
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
                        <Stack 
                          direction={{ base: "column", sm: "row" }}
                          spacing={3}
                          align="flex-start"
                        >
                          {/* ICONO + INFO EN MOBILE */}
                          <HStack w="full" spacing={3}>
                            <Box
                              p={1.5}
                              borderRadius="md"
                              bg={hasArrived ? "green.50" : "blue.50"}
                              flexShrink={0}
                            >
                              <Icon
                                as={hasArrived ? Package : GiCargoShip}
                                boxSize={5}
                                color={hasArrived ? "green.600" : "blue.600"}
                              />
                            </Box>

                            {/* CONTENIDO */}
                            <VStack align="start" spacing={1} flex={1} minW={0}>
                              {(() => {
                                const match = product.itemDescription?.match(/^([A-Z0-9\-\/]+)\s/);
                                const vendorCode = match?.[1];

                                return vendorCode ? (
                                  <HStack spacing={1} flexWrap="wrap">
                                    <Badge
                                      colorScheme="purple"
                                      fontSize="xs"
                                      px={2}
                                      py={0.5}
                                      borderRadius="md"
                                      fontWeight="bold"
                                    >
                                      {vendorCode}
                                    </Badge>

                                    <Text
                                      fontSize="xs"
                                      color="gray.500"
                                      fontWeight="semibold"
                                      whiteSpace="nowrap"
                                    >
                                      {product.itemCode}
                                    </Text>
                                  </HStack>
                                ) : (
                                  <Text
                                    fontSize="xs"
                                    color="gray.500"
                                    fontWeight="semibold"
                                  >
                                    {product.itemCode}
                                  </Text>
                                );
                              })()}

                              <Text 
                                fontSize="sm" 
                                color={textMuted}
                                noOfLines={2}
                                wordBreak="break-word"
                              >
                                {product.itemDescription}
                              </Text>

                              {/* CANTIDAD Y FECHA EN MOBILE */}
                              <HStack 
                                w="full" 
                                justify="space-between" 
                                mt={2}
                                display={{ base: "flex", sm: "none" }}
                              >
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
                              </HStack>
                            </VStack>

                            {/* CANTIDAD Y FECHA EN DESKTOP */}
                            <VStack 
                              align="end" 
                              spacing={1}
                              display={{ base: "none", sm: "flex" }}
                              flexShrink={0}
                            >
                              <Text
                                fontSize="xl"
                                fontWeight="extrabold"
                                color={hasArrived ? "green.600" : "orange.600"}
                              >
                                {product.quantity}
                              </Text>
                              <HStack spacing={1}>
                                <Calendar size={14} />
                                <Text fontSize="sm" color={textMuted} whiteSpace="nowrap">
                                  {new Date(product.fechaIngreso).toLocaleDateString("es-PE", {
                                    day: "2-digit",
                                    month: "short"
                                  })}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>
                        </Stack>
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
        <HStack justify="space-between" w="full">
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