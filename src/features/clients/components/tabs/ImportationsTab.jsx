import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  useColorModeValue,
  Flex
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { Search, Calendar, Package } from "lucide-react";
import { GiCargoShip } from "react-icons/gi";

const PAGE_SIZE = 10;

export function ImportationsTab({ data = [], isLoading, error, onRetry }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");

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

  const sortedData = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => new Date(a.fechaIngreso) - new Date(b.fechaIngreso)
    );
  }, [filteredData]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const paginatedData = sortedData.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (isLoading) {
    return (
      <VStack py={10}>
        <Spinner />
        <Text fontSize="sm" color={textMuted}>
          Cargando importaciones...
        </Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack py={10} spacing={3}>
        <Text color="red.500" fontSize="sm">
          Error al cargar importaciones
        </Text>
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </VStack>
    );
  }

  if (!data.length) {
    return (
      <VStack py={10}>
        <Package size={28} />
        <Text fontSize="sm" color={textMuted}>
          No hay importaciones
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={3} align="stretch">

      {/* SEARCH */}
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none">
          <Search size={14} />
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

      {/* LIST */}
      <VStack spacing={2} align="stretch">
        {paginatedData.map((product, idx) => {
          const today = new Date().setHours(0, 0, 0, 0);
          const arrival = new Date(product.fechaIngreso).setHours(0, 0, 0, 0);
          const hasArrived = today >= arrival;

          const match = product.itemDescription?.match(/^([A-Z0-9\-\/]+)\s/);
          const vendorCode = match?.[1];

          return (
            <Box
              key={`${product.itemCode}-${idx}`}
              p={3}
              bg={bgCard}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="lg"
            >
              <Flex gap={3} align="stretch">

                {/* LEFT */}
                <VStack align="start" spacing={1} flex="1">
                  {vendorCode && (
                    <Text fontSize="xs" fontWeight="bold">
                      {vendorCode}
                    </Text>
                  )}

                  <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                    {product.itemDescription}
                  </Text>

                  <HStack spacing={1} pt={1}>
                    <Icon
                      as={hasArrived ? Package : GiCargoShip}
                      boxSize={4}
                      color={hasArrived ? "green.500" : "blue.500"}
                    />
                    <Text fontSize="xs" color={textMuted}>
                      {hasArrived ? "Arribó" : "En tránsito"}
                    </Text>
                  </HStack>
                </VStack>

                {/* RIGHT */}
                <VStack align="end" spacing={1} minW="60px">
                  <Text fontSize="lg" fontWeight="bold">
                    {product.quantity}
                  </Text>

                  <HStack spacing={1}>
                    <Calendar size={12} />
                    <Text fontSize="2xs" color={textMuted}>
                      {new Date(product.fechaIngreso).toLocaleDateString(
                        "es-PE",
                        {
                          day: "2-digit",
                          month: "short"
                        }
                      )}
                    </Text>
                  </HStack>
                </VStack>

              </Flex>
            </Box>
          );
        })}
      </VStack>

      {/* PAGINATION */}
      {sortedData.length > PAGE_SIZE && (
        <Flex gap={2}>
          <Button
            size="sm"
            flex="1"
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            isDisabled={page === 1}
          >
            Anterior
          </Button>

          <Button
            size="sm"
            flex="1"
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            isDisabled={page === totalPages}
          >
            Siguiente
          </Button>
        </Flex>
      )}

      <Text fontSize="2xs" textAlign="center" color={textMuted}>
        {sortedData.length} productos
      </Text>
    </VStack>
  );
}
