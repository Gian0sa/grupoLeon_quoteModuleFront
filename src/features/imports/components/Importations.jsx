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
import { Search, Calendar, Package, Hash, Tag } from "lucide-react";

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

            <Accordion allowMultiple reduceMotion>
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
                            <AccordionButton _hover={{ bg: bgHover }} px={{ base: 3, sm: 4 }}>
                                <Box flex="1" textAlign="left" minW={0}>
                                    <Stack
                                        direction={{ base: "column", sm: "row" }}
                                        spacing={2}
                                        justify="space-between"
                                        align={{ base: "flex-start", sm: "center" }}
                                    >
                                        <HStack spacing={2} flexWrap="wrap">
                                            <Badge
                                                colorScheme="purple"
                                                fontSize={{ base: "xs", sm: "md" }}
                                                maxW="100%"
                                                noOfLines={1}
                                            >
                                                <HStack spacing={1}>
                                                    <Tag size={12} />
                                                    <Text noOfLines={1}>{line.linea}</Text>
                                                </HStack>
                                            </Badge>

                                            <Badge fontSize="xs" variant="outline">
                                                {line.products.length} prod.
                                            </Badge>
                                        </HStack>

                                        <HStack spacing={2}>
                                            <Badge colorScheme="green" fontSize="xs">
                                                Total: {totalQuantity}
                                            </Badge>
                                            <AccordionIcon />
                                        </HStack>
                                    </Stack>
                                </Box>
                            </AccordionButton>

                            <AccordionPanel bg={bgAccordion} p={{ base: 2, sm: 3 }}>
                                <VStack spacing={2} align="stretch">
                                    {line.products.map((product, idx) => {
                                        const today = new Date().setHours(0, 0, 0, 0);
                                        const arrival = new Date(product.fechaIngreso).setHours(
                                            0,
                                            0,
                                            0,
                                            0
                                        );
                                        const hasArrived = today >= arrival;

                                        return (
                                            <Box
                                                key={`${product.itemCode}-${idx}`}
                                                p={{ base: 2, sm: 3 }}
                                                bg={bgCard}
                                                border="1px solid"
                                                borderColor={borderColor}
                                                borderRadius="md"
                                                minW={0}
                                            >
                                                {/* Código + descripción */}
                                                <Text
                                                    fontSize="xs"
                                                    noOfLines={1}
                                                    display="flex"
                                                    alignItems="center"
                                                    gap={1}
                                                    flexWrap="nowrap"
                                                >
                                                    {(() => {
                                                        const match =
                                                            product.itemDescription?.match(/^([A-Z0-9\-\/]+)\s/);
                                                        const vendorCode = match ? match[1] : null;

                                                        return vendorCode ? (
                                                            <Badge
                                                                colorScheme="purple"
                                                                fontSize="xs"
                                                                px={1.5}
                                                                py={0.5}
                                                                borderRadius="md"
                                                                fontWeight="bold"
                                                                flexShrink={0}
                                                            >
                                                                {vendorCode}
                                                            </Badge>
                                                        ) : null;
                                                    })()}



                                                    <Text as="span" color={textMuted} isTruncated>
                                                        ·{" "}
                                                        {(() => {
                                                            const desc = product.itemDescription || "";
                                                            const match = desc.match(
                                                                /^[A-Z0-9\-\/]+\s(.+)$/
                                                            );
                                                            return match ? match[1] : desc;
                                                        })()}
                                                    </Text>

                                                    <Text as="span" fontWeight="bold" flexShrink={0}>
                                                        {product.itemCode}
                                                    </Text>
                                                </Text>

                                                {/* Fecha */}
                                                <HStack spacing={1} mt={1}>
                                                    <Calendar size={14} />
                                                    <Text fontSize="xs" color={textMuted}>
                                                        {new Date(product.fechaIngreso).toLocaleDateString("es-PE", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "2-digit"
                                                        })}
                                                    </Text>
                                                </HStack>


                                                {/* Estado + cantidad */}
                                                <Stack
                                                    direction="row"
                                                    justify="space-between"
                                                    align="center"
                                                    mt={1}
                                                >
                                                    <Badge
                                                        fontSize="xs"
                                                        colorScheme={hasArrived ? "green" : "orange"}
                                                    >
                                                        {hasArrived ? "Arribó" : "En tránsito"}
                                                    </Badge>

                                                    <Text fontSize="xs" fontWeight="bold">
                                                        Cant: {product.quantity}
                                                    </Text>
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
