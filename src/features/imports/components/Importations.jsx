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
    useColorModeValue,
    Divider,
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
        return data.filter(i =>
            i.linea?.toLowerCase().includes(q) ||
            i.itemCode?.toLowerCase().includes(q) ||
            i.itemDescription?.toLowerCase().includes(q) ||
            String(i.nroImportacion).includes(q)
        );
    }, [data, search]);

    const groupedByLine = useMemo(() => {
        const map = new Map();
        filteredData.forEach(item => {
            const key = item.linea || "Sin línea";
            if (!map.has(key)) map.set(key, { linea: key, products: [] });
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
                <Text fontSize="sm" color={textMuted}>
                    Cargando importaciones…
                </Text>
            </VStack>
        );
    }

    if (!data.length) {
        return (
            <VStack py={12}>
                <Package size={40} />
                <Text fontWeight="medium">No hay importaciones</Text>
            </VStack>
        );
    }

    return (
        <VStack spacing={5} align="stretch">
            {/* 🔍 Buscar */}
            <InputGroup>
                <InputLeftElement pointerEvents="none">
                    <Search size={16} />
                </InputLeftElement>
                <Input
                    placeholder="Buscar importaciones…"
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    bg={bgCard}
                />
            </InputGroup>

            <HStack justify="space-between">
                <Text fontSize="sm" color={textMuted}>
                    Líneas ({groupedByLine.length})
                </Text>
                <Badge fontSize="xs">Agrupado por línea</Badge>
            </HStack>

            {/* 📦 Líneas */}
            <Accordion allowMultiple>
                {paginatedLines.map(line => {
                    const totalQty = line.products.reduce(
                        (sum, p) => sum + p.quantity,
                        0
                    );

                    return (
                        <AccordionItem
                            key={line.linea}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="lg"
                            mb={2}
                        >
                            <AccordionButton px={3} py={3} _hover={{ bg: bgHover }}>
                                <Stack
                                    w="full"
                                    direction={{ base: "column", md: "row" }}
                                    spacing={2}
                                    align={{ md: "center" }}
                                    justify="space-between"
                                >
                                    <HStack>
                                        <Badge colorScheme="purple">
                                            <HStack spacing={1}>
                                                <Tag size={12} />
                                                <Text fontSize="sm">{line.linea}</Text>
                                            </HStack>
                                        </Badge>
                                        <Badge fontSize="xs">
                                            {line.products.length} prod.
                                        </Badge>
                                    </HStack>

                                    <HStack>
                                        <Badge colorScheme="green">
                                            Total: {totalQty}
                                        </Badge>
                                        <AccordionIcon />
                                    </HStack>
                                </Stack>
                            </AccordionButton>

                            <AccordionPanel bg={bgAccordion} px={2} py={3}>
                                <VStack spacing={3}>
                                    {line.products.map((p, idx) => {
                                        const arrived =
                                            new Date() >= new Date(p.fechaIngreso);

                                        return (
                                            <Box
                                                key={idx}
                                                w="full"
                                                p={3}
                                                bg={bgCard}
                                                border="1px solid"
                                                borderColor={borderColor}
                                                borderRadius="md"
                                            >
                                                {(() => {
                                                    const desc = p.itemDescription || "";

                                                    // Código vendedor = primera palabra
                                                    const match = desc.match(/^([A-Z0-9]+)\s+(.*)$/);
                                                    const vendorCode = match?.[1];
                                                    const cleanDescription = match?.[2] || desc;

                                                    return (
                                                        <VStack align="stretch" spacing={1}>
                                                            <HStack justify="space-between" align="center">
                                                                {vendorCode && (
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
                                                                )}

                                                                <HStack spacing={1}>
                                                                    <Calendar size={14} />
                                                                    <Text fontSize="md">
                                                                        {new Date(p.fechaIngreso).toLocaleDateString()}
                                                                    </Text>
                                                                </HStack>
                                                            </HStack>

                                                            <Text fontSize="xs" lineHeight="short">
                                                                {cleanDescription}
                                                            </Text>

                                                            <Divider />

                                                            <HStack justify="space-between">
                                                                <Badge
                                                                    colorScheme={arrived ? "green" : "orange"}
                                                                    fontSize="xs"
                                                                >
                                                                    {arrived ? "Arribó" : "En tránsito"}
                                                                </Badge>

                                                                <Text fontSize="sm" fontWeight="bold">
                                                                    Cant: {p.quantity}
                                                                </Text>
                                                            </HStack>
                                                        </VStack>
                                                    );
                                                })()}
                                            </Box>

                                        );
                                    })}
                                </VStack>
                            </AccordionPanel>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            {/* 📄 Paginación */}
            {groupedByLine.length > PAGE_SIZE && (
                <Stack
                    direction={{ base: "column", sm: "row" }}
                    justify="space-between"
                    spacing={3}
                >
                    <Button
                        size="sm"
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        isDisabled={page === 1}
                    >
                        Anterior
                    </Button>

                    <Badge>
                        Página {page} de {totalPages}
                    </Badge>

                    <Button
                        size="sm"
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        isDisabled={page === totalPages}
                    >
                        Siguiente
                    </Button>
                </Stack>
            )}
        </VStack>
    );
}
