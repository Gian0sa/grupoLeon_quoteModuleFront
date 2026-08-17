import {
    Box,
    Heading,
    VStack,
    HStack,
    Text,
    Badge,
    Spinner,
    Card,
    CardBody,
    useColorModeValue,
    Divider,
    Button,
    Input,
    Collapse,
    IconButton,
    Flex,
    SimpleGrid,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useVisitLogs } from "../hooks/queries/visitLogQueries";
import { useSellersData } from "../../auth/hooks/queries/authQueries";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import Select from "react-select";
import { getToday, getYesterday, getLastWeek, getFirstDayOfMonth, getLastDayOfMonth, formatDateForInput } from "../utils/datePresets";
import { formatDateTime, formatDate, formatTime, calculateDuration } from "../utils/dateUtils";
import MapMarkers from "../components/MapMarkers";
import "../map/leafletConfig";
import { VENDOR_COLOR_PALETTE } from "../constants/colors";
import { MapUpdater, MapBoundsUpdater } from "../map/utilsMap";
import Estadisticas from "../components/Estadisticas";
import {
    FiCalendar,
    FiFilter,
    FiMapPin,
    FiClock,
    FiRotateCcw,
    FiChevronDown,
    FiChevronUp,
    FiNavigation,
    FiActivity,
    FiAlertCircle,
} from "react-icons/fi";

const customSelectStyles = {
    control: (provided, state) => ({
        ...provided,
        minHeight: "38px",
        height: "38px",
        borderRadius: "10px",
        borderColor: state.isFocused ? "#0e572b" : "#e2e8f0",
        boxShadow: state.isFocused ? "0 0 0 1px #0e572b" : "none",
        "&:hover": {
            borderColor: "#cbd5e1",
        },
    }),
    valueContainer: (provided) => ({
        ...provided,
        height: "38px",
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
    }),
    indicatorsContainer: (provided) => ({
        ...provided,
        height: "38px",
    }),
    singleValue: (provided) => ({
        ...provided,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        margin: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontWeight: "600",
        fontSize: "12px",
        color: "#1e293b",
    }),
    menuList: (provided) => ({
        ...provided,
        maxHeight: "200px",
        padding: "4px",
        overflowY: "auto",
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999,
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
        border: "1px solid #f1f5f9",
    }),
    option: (provided, state) => ({
        ...provided,
        borderRadius: "6px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: "500",
        backgroundColor: state.isSelected
            ? "#ecfdf5"
            : state.isFocused
            ? "#f8fafc"
            : "transparent",
        color: state.isSelected ? "#0e572b" : "#334155",
        cursor: "pointer",
    }),
};

function VendorRoute({ visits, color = "#0e572b" }) {
    if (!visits || visits.length < 2) return null;

    const positions = visits.map(v => [v.latitude, v.longitude]);

    return (
        <>
            <Polyline
                positions={positions}
                color={color}
                weight={4}
                opacity={0.8}
            />
            <Polyline
                positions={positions}
                color="#ffffff"
                weight={2}
                opacity={0.9}
                dashArray="8, 12"
            />
        </>
    );
}

export default function VisitLogsMapView() {
    const [selectedVendor, setSelectedVendor] = useState("all");
    const [mapCenter, setMapCenter] = useState([-12.0464, -77.0428]);
    const [mapZoom, setMapZoom] = useState(13);
    const [showFilters, setShowFilters] = useState(true);
    const [hoveredStore, setHoveredStore] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);
    const [showVendorRoute, setShowVendorRoute] = useState(false);

    const todayStr = formatDateForInput(getToday());

    const [datePreset, setDatePreset] = useState("today");
    const [dateFrom, setDateFrom] = useState(todayStr);
    const [dateTo, setDateTo] = useState(todayStr);

    const [statusFilter, setStatusFilter] = useState("all");

    const pageBg = useColorModeValue("gray.50", "gray.900");
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.100", "gray.700");
    const statBg = useColorModeValue("green.50", "green.900");
    const hoverBg = useColorModeValue("gray.50", "gray.700");
    const purpleHeaderBg = useColorModeValue("purple.50", "purple.900");

    // 1. Cargar la lista oficial completa de vendedores desde el módulo Auth
    const { data: sellersDataResponse, isLoading: isLoadingSellers } = useSellersData();

    const filters = {
        vendor: selectedVendor,
        status: statusFilter,
        dateFrom,
        dateTo,
    };
    const { data, isLoading, error } = useVisitLogs(filters);
    const visitLogs = data?.visits || [];

    // 2. Extraer y unificar TODOS los vendedores (Auth API + Visit Logs) con fallback `SalesEmployeeName` de SAP
    const allVendorNames = useMemo(() => {
        const officialSellers = Array.isArray(sellersDataResponse)
            ? sellersDataResponse
            : (sellersDataResponse?.sellers || sellersDataResponse?.data || sellersDataResponse?.records || []);

        const officialNames = (Array.isArray(officialSellers) ? officialSellers : [])
            .map(s => s.SalesEmployeeName || s.SlpName || s.name || s.username || s.vendedorName || s.vendedor)
            .filter(Boolean);

        const visitLogNames = (visitLogs || []).map(v => v.vendorName).filter(Boolean);

        const setMap = new Map();
        [...officialNames, ...visitLogNames].forEach(name => {
            const clean = String(name).trim();
            if (clean && !setMap.has(clean.toLowerCase())) {
                setMap.set(clean.toLowerCase(), clean);
            }
        });

        return Array.from(setMap.values()).sort((a, b) => a.localeCompare(b));
    }, [sellersDataResponse, visitLogs]);

    const vendorColorMap = useMemo(() => {
        const map = {};
        allVendorNames.forEach((vendor, index) => {
            map[vendor] = VENDOR_COLOR_PALETTE[index % VENDOR_COLOR_PALETTE.length];
        });
        return map;
    }, [allVendorNames]);

    const vendorOptions = useMemo(() => [
        { value: "all", label: "Todos los Vendedores", color: "#64748b" },
        ...allVendorNames.map((vendor) => ({
            value: vendor,
            label: vendor,
            color: vendorColorMap[vendor] || "#0e572b",
        })),
    ], [allVendorNames, vendorColorMap]);

    const customOption = (props) => {
        const { data, innerRef, innerProps } = props;
        return (
            <div
                ref={innerRef}
                {...innerProps}
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    cursor: "pointer",
                }}
            >
                <div
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: data.color,
                        marginRight: 8,
                        flexShrink: 0,
                    }}
                />
                <span style={{ fontSize: "12px", fontWeight: "600" }}>{data.label}</span>
            </div>
        );
    };

    const customSingleValue = ({ data }) => (
        <div style={{ display: "flex", alignItems: "center" }}>
            <div
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: data.color,
                    marginRight: 6,
                    flexShrink: 0,
                }}
            />
            <span>{data.label}</span>
        </div>
    );

    const handleDatePresetChange = (preset) => {
        setDatePreset(preset);
        switch (preset) {
            case "today":
                setDateFrom(formatDateForInput(getToday()));
                setDateTo(formatDateForInput(getToday()));
                break;
            case "yesterday":
                const yesterday = getYesterday();
                setDateFrom(formatDateForInput(yesterday));
                setDateTo(formatDateForInput(yesterday));
                break;
            case "last7days":
                setDateFrom(formatDateForInput(getLastWeek()));
                setDateTo(formatDateForInput(getToday()));
                break;
            case "last30days":
                setDateFrom(formatDateForInput(getFirstDayOfMonth()));
                setDateTo(formatDateForInput(getLastDayOfMonth()));
                break;
            case "all":
                setDateFrom("");
                setDateTo("");
                break;
            case "custom":
                break;
            default:
                break;
        }
    };

    const filteredGroups = useMemo(() => {
        let result = Array.isArray(visitLogs) ? visitLogs : [];

        // 1. Filtrado flexible por vendedor (coincidencia con o sin prefijo como "741.")
        if (selectedVendor && selectedVendor !== "all") {
            const cleanSelected = String(selectedVendor).replace(/^\d+\.\s*/, "").toLowerCase().trim();
            result = result.filter(g => {
                const vName = String(g.vendorName || g.in?.vendorName || g.out?.vendorName || "").toLowerCase().trim();
                const cleanVName = vName.replace(/^\d+\.\s*/, "");
                return vName.includes(cleanSelected) || cleanVName.includes(cleanSelected) || vName === String(selectedVendor).toLowerCase();
            });
        }

        return result;
    }, [visitLogs, selectedVendor]);

    const vendorRouteData = useMemo(() => {
        if (selectedVendor === "all" || !showVendorRoute) return null;

        const vendorVisits = filteredGroups
            .filter(g => g.in)
            .map(g => ({
                ...g.in,
                storeName: g.storeName,
                groupId: g.id
            }))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        if (vendorVisits.length < 2) return null;

        return {
            visits: vendorVisits,
            bounds: vendorVisits.map(v => [v.latitude, v.longitude])
        };
    }, [selectedVendor, filteredGroups, showVendorRoute]);

    const groupsWithSequence = useMemo(() => {
        if (!vendorRouteData) return filteredGroups;

        return filteredGroups.map(group => {
            if (!group.in) return group;

            const sequenceIndex = vendorRouteData.visits.findIndex(
                v => v.groupId === group.id
            );

            return {
                ...group,
                sequenceNumber: sequenceIndex >= 0 ? sequenceIndex + 1 : null
            };
        });
    }, [filteredGroups, vendorRouteData]);

    const groupedByDay = useMemo(() => {
        const grouped = {};

        groupsWithSequence.forEach(group => {
            const visitDateTime = new Date(group.in?.createdAt || group.out?.createdAt);
            const localDate = new Date(visitDateTime.getFullYear(), visitDateTime.getMonth(), visitDateTime.getDate());
            const dateKey = formatDate(localDate);

            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    date: dateKey,
                    fullDate: localDate,
                    visits: []
                };
            }

            grouped[dateKey].visits.push(group);
        });

        return Object.values(grouped).sort((a, b) => b.fullDate - a.fullDate);
    }, [groupsWithSequence]);

    const stats = useMemo(() => {
        const completedVisits = filteredGroups.filter(g => g.in && g.out).length;
        const pendingCheckOut = filteredGroups.filter(g => g.in && !g.out).length;
        const orphanCheckOut = filteredGroups.filter(g => !g.in && g.out).length;
        const totalVisits = completedVisits + pendingCheckOut;

        let totalDuration = 0;
        let visitCount = 0;
        filteredGroups.forEach(g => {
            if (g.in && g.out) {
                const diff = new Date(g.out.createdAt) - new Date(g.in.createdAt);
                totalDuration += diff;
                visitCount++;
            }
        });
        const avgDuration = visitCount > 0 ? totalDuration / visitCount : 0;
        const avgHours = Math.floor(avgDuration / (1000 * 60 * 60));
        const avgMinutes = Math.floor((avgDuration % (1000 * 60 * 60)) / (1000 * 60));

        return {
            total: totalVisits,
            completed: completedVisits,
            pending: pendingCheckOut,
            errors: 0,
            totalVisits,
            completedVisits,
            pendingCheckOut,
            orphanCheckOut,
            avgDuration: visitCount > 0 ? `${avgHours}h ${avgMinutes}m` : "N/A",
        };
    }, [filteredGroups]);

    useEffect(() => {
        if (selectedVendor !== "all") {
            setShowVendorRoute(true);
        } else {
            setShowVendorRoute(false);
        }
    }, [selectedVendor]);

    const handleMarkerClick = (group) => {
        setSelectedStore(group.id);
        const location = group.in || group.out;
        if (location) {
            setMapCenter([location.latitude, location.longitude]);
            setMapZoom(16);
        }
    };

    const handleCardClick = (group) => {
        setSelectedStore(group.id);
        const location = group.in || group.out;
        if (location) {
            setMapCenter([location.latitude, location.longitude]);
            setMapZoom(16);
        }
    };

    const clearFilters = () => {
        setSelectedVendor("all");
        setDatePreset("today");
        setDateFrom(todayStr);
        setDateTo(todayStr);
        setStatusFilter("all");
        setShowVendorRoute(false);
    };

    const presetButtons = [
        { id: "today", label: "Hoy", icon: FiCalendar },
        { id: "yesterday", label: "Ayer", icon: FiClock },
        { id: "last7days", label: "7 días", icon: FiActivity },
        { id: "last30days", label: "Este Mes", icon: FiCalendar },
        { id: "all", label: "Todas", icon: FiFilter },
        { id: "custom", label: "F. Rango", icon: FiFilter },
    ];

    if (isLoading) {
        return (
            <Box textAlign="center" py={12} px={4}>
                <VStack spacing={3}>
                    <Spinner size="lg" color="green.600" thickness="3px" speed="0.75s" />
                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                        Cargando mapa de visitas...
                    </Text>
                </VStack>
            </Box>
        );
    }

    if (error) {
        return (
            <Box textAlign="center" py={10} px={4}>
                <Card bg="red.50" borderColor="red.200" maxW="450px" mx="auto" borderRadius="xl">
                    <CardBody p={5}>
                        <VStack spacing={2.5}>
                            <FiAlertCircle size={32} color="#e11d48" />
                            <Text color="red.700" fontWeight="bold" fontSize="sm">
                                ⚠️ Error al cargar las visitas de campo
                            </Text>
                            <Text color="red.600" fontSize="xs">
                                {error.message || "Por favor verifica la conexión con el servidor o reintenta."}
                            </Text>
                            <Button size="xs" colorScheme="red" borderRadius="lg" onClick={clearFilters}>
                                Reintentar
                            </Button>
                        </VStack>
                    </CardBody>
                </Card>
            </Box>
        );
    }

    return (
        <Box w="full" minH="100vh" bg={pageBg}>
            {/* 1. ENCABEZADO GLOBAL ESTÁNDAR COMPACTO DE LA APLICACIÓN */}
            <TopHeaderBanner
                title="Mapa y Rutas de Visitas"
                subtitle="Monitoreo geolocalizado y seguimiento de la fuerza de ventas en tiempo real"
                showBack={true}
                minH={{ base: "135px", sm: "145px", md: "155px" }}
                pt={{ base: 3, md: 4 }}
                pb={{ base: 3, md: 4 }}
                mb={0}
            />

            {/* 2. CONTENEDOR PRINCIPAL CENTRADO Y TOTALMENTE RESPONSIVO PARA MÓVIL Y DESKTOP */}
            <Box maxW="1200px" mx="auto" px={{ base: 2.5, sm: 4, md: 6 }} py={{ base: 3, md: 5 }}>
                <VStack spacing={{ base: 3, md: 4 }} align="stretch" w="full">

                    {/* PANEL DE FILTROS COMPACTO Y ALINEADO */}
                    <Card bg={cardBg} borderColor={borderColor} borderRadius="xl" boxShadow="0 4px 15px rgba(0,0,0,0.02)">
                        <CardBody p={{ base: 2.5, sm: 3, md: 3.5 }}>
                            <VStack align="stretch" spacing={2.5}>
                                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                    <HStack spacing={2}>
                                        <Flex w="26px" h="26px" borderRadius="md" bg="green.50" align="center" justify="center" color="green.600">
                                            <FiFilter size={13} />
                                        </Flex>
                                        <Text fontWeight="800" fontSize={{ base: "xs", sm: "sm" }} color="gray.800">
                                            Filtros de Búsqueda y Monitoreo
                                        </Text>
                                    </HStack>

                                    <HStack spacing={1.5}>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            colorScheme="red"
                                            leftIcon={<FiRotateCcw size={11} />}
                                            onClick={clearFilters}
                                            fontSize="10px"
                                            fontWeight="700"
                                            borderRadius="md"
                                            px={2}
                                            h="24px"
                                        >
                                            Limpiar
                                        </Button>
                                        <IconButton
                                            size="xs"
                                            icon={showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                            onClick={() => setShowFilters(!showFilters)}
                                            variant="ghost"
                                            borderRadius="md"
                                            h="24px"
                                            w="24px"
                                            aria-label="Toggle Filters"
                                        />
                                    </HStack>
                                </Flex>

                                <Collapse in={showFilters}>
                                    <VStack spacing={2.5} align="stretch" pt={0.5}>
                                        {/* Dropdowns de Vendedor y Estado */}
                                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2.5}>
                                            <Box>
                                                <Text fontSize="11px" fontWeight="700" color="gray.700" mb={1}>
                                                     Fuerza de Ventas ({allVendorNames.length} Vendedores)
                                                </Text>
                                                <Select
                                                    options={vendorOptions}
                                                    value={vendorOptions.find(opt => opt.value === selectedVendor)}
                                                    onChange={(option) => setSelectedVendor(option.value)}
                                                    components={{
                                                        Option: customOption,
                                                        SingleValue: customSingleValue,
                                                    }}
                                                    styles={customSelectStyles}
                                                    isLoading={isLoadingSellers}
                                                    placeholder="Seleccionar vendedor..."
                                                />
                                            </Box>

                                            <Box>
                                                <Text fontSize="11px" fontWeight="700" color="gray.700" mb={1}>
                                                    📊 Estado de la Visita
                                                </Text>
                                                <Select
                                                    options={[
                                                        { value: "all", label: "Todas las visitas" },
                                                        { value: "completed", label: "✅ Completadas (Check-In & Out)" },
                                                        { value: "pending", label: "⏳ En curso / Pendientes" },
                                                    ]}
                                                    value={{
                                                        value: statusFilter,
                                                        label:
                                                            statusFilter === "all"
                                                                ? "Todas las visitas"
                                                                : statusFilter === "completed"
                                                                    ? "✅ Completadas (Check-In & Out)"
                                                                    : "⏳ En curso / Pendientes",
                                                    }}
                                                    onChange={(option) => setStatusFilter(option.value)}
                                                    styles={customSelectStyles}
                                                />
                                            </Box>
                                        </SimpleGrid>

                                        <Divider borderColor="gray.100" />

                                        {/* FILTRADO DE FECHA CON PASTILLAS VISUALES REORGANIZADAS PARA MÓVIL Y DESKTOP */}
                                        <Box>
                                            <Flex align="center" justify="space-between" mb={1.5}>
                                                <HStack spacing={1.5}>
                                                    <FiCalendar size={13} color="#0e572b" />
                                                    <Text fontSize="11px" fontWeight="800" color="gray.800">
                                                        Filtrar por Fecha de Visita
                                                    </Text>
                                                </HStack>
                                            </Flex>

                                            {/* Presets visuales organizados en SimpleGrid responsivo (3 cols móvil, 6 cols desktop) */}
                                            <SimpleGrid columns={{ base: 3, sm: 6 }} spacing={1.5} mb={2}>
                                                {presetButtons.map((btn) => {
                                                    const isActive = datePreset === btn.id;
                                                    const IconComp = btn.icon;
                                                    return (
                                                        <Button
                                                            key={btn.id}
                                                            size="xs"
                                                            h="28px"
                                                            px={1.5}
                                                            borderRadius="lg"
                                                            fontWeight="700"
                                                            fontSize="10px"
                                                            leftIcon={<IconComp size={11} />}
                                                            style={{
                                                                background: isActive
                                                                    ? "linear-gradient(135deg, #0e572b 0%, #126C36 100%)"
                                                                    : "#f1f5f9",
                                                                color: isActive ? "#ffffff" : "#475569",
                                                                boxShadow: isActive ? "0 2px 8px rgba(14, 87, 43, 0.2)" : "none",
                                                                transition: "all 0.15s ease-in-out",
                                                            }}
                                                            _hover={{
                                                                transform: "translateY(-1px)",
                                                                background: isActive
                                                                    ? "linear-gradient(135deg, #0b4a24 0%, #0e572b 100%)"
                                                                    : "#e2e8f0",
                                                            }}
                                                            onClick={() => handleDatePresetChange(btn.id)}
                                                        >
                                                            {btn.label}
                                                        </Button>
                                                    );
                                                })}
                                            </SimpleGrid>

                                            {/* Rango Personalizado */}
                                            {datePreset === "custom" && (
                                                <Box p={2.5} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200" mb={2}>
                                                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                                                        <Box>
                                                            <Text fontSize="10px" fontWeight="700" color="gray.600" mb={0.5}>Fecha Inicial:</Text>
                                                            <Input
                                                                type="date"
                                                                value={dateFrom}
                                                                onChange={(e) => setDateFrom(e.target.value)}
                                                                size="xs"
                                                                borderRadius="md"
                                                                bg="white"
                                                                borderColor="gray.300"
                                                                fontSize="11px"
                                                                h="28px"
                                                            />
                                                        </Box>
                                                        <Box>
                                                            <Text fontSize="10px" fontWeight="700" color="gray.600" mb={0.5}>Fecha Final:</Text>
                                                            <Input
                                                                type="date"
                                                                value={dateTo}
                                                                onChange={(e) => setDateTo(e.target.value)}
                                                                size="xs"
                                                                borderRadius="md"
                                                                bg="white"
                                                                borderColor="gray.300"
                                                                fontSize="11px"
                                                                h="28px"
                                                            />
                                                        </Box>
                                                    </SimpleGrid>
                                                </Box>
                                            )}

                                            {/* Barra de Período Activo */}
                                            {(dateFrom || dateTo) && (
                                                <Flex align="center" justify="space-between" p={2} bg="green.50" borderRadius="lg" border="1px solid" borderColor="green.200">
                                                    <HStack spacing={1.5} flexWrap="wrap">
                                                        <Text fontSize="10px" fontWeight="800" color="green.800">
                                                            📆 Período:
                                                        </Text>
                                                        <Badge colorScheme="green" variant="solid" borderRadius="md" px={1.5} fontSize="10px">
                                                            {dateFrom || "Inicio"}
                                                        </Badge>
                                                        <Text fontSize="10px" fontWeight="bold" color="green.700">→</Text>
                                                        <Badge colorScheme="green" variant="solid" borderRadius="md" px={1.5} fontSize="10px">
                                                            {dateTo || "Hoy"}
                                                        </Badge>
                                                    </HStack>
                                                </Flex>
                                            )}
                                        </Box>

                                        {/* Control de Ruta de Vendedor */}
                                        {selectedVendor !== "all" && (
                                            <HStack p={2.5} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200" justify="space-between" flexWrap="wrap" gap={1.5}>
                                                <HStack spacing={1.5}>
                                                    <FiNavigation color="#2563eb" size={14} />
                                                    <Box>
                                                        <Text fontSize="11px" fontWeight="800" color="blue.900">
                                                            Traza de Ruta de {selectedVendor}
                                                        </Text>
                                                        <Text fontSize="10px" color="blue.700">
                                                            Muestra la secuencia de paradas en el mapa
                                                        </Text>
                                                    </Box>
                                                </HStack>
                                                <Button
                                                    size="xs"
                                                    colorScheme={showVendorRoute ? "blue" : "gray"}
                                                    borderRadius="md"
                                                    fontWeight="700"
                                                    h="24px"
                                                    fontSize="10px"
                                                    onClick={() => setShowVendorRoute(!showVendorRoute)}
                                                >
                                                    {showVendorRoute ? "✓ Ruta Activada" : "Activar Ruta"}
                                                </Button>
                                            </HStack>
                                        )}

                                        {/* Resumen de Trayectoria */}
                                        {vendorRouteData && showVendorRoute && (
                                            <Card bg="green.50" borderColor="green.200" borderRadius="lg">
                                                <CardBody p={2.5}>
                                                    <VStack align="stretch" spacing={1}>
                                                        <Text fontSize="11px" fontWeight="800" color="green.900">
                                                            📍 Trayectoria Calculada ({selectedVendor})
                                                        </Text>
                                                        <HStack spacing={1.5} flexWrap="wrap">
                                                            <Badge colorScheme="green" borderRadius="md" fontSize="9px">
                                                                {vendorRouteData.visits.length} paradas registradas
                                                            </Badge>
                                                            <Text fontSize="10px" color="green.800">
                                                                Los números señalan el orden cronológico
                                                            </Text>
                                                        </HStack>
                                                    </VStack>
                                                </CardBody>
                                            </Card>
                                        )}
                                    </VStack>
                                </Collapse>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* TARJETAS DE ESTADÍSTICAS RÁPIDAS OPTIMIZADAS */}
                    <Estadisticas stats={stats} statBg={statBg} borderColor={borderColor} />

                    {/* VISOR DE MAPA LEAFLET SATELITAL CON PINS SVG TEARDROP */}
                    <Card bg={cardBg} borderColor={borderColor} borderRadius="xl" boxShadow="0 4px 15px rgba(0,0,0,0.03)" overflow="hidden">
                        <CardBody p={0}>
                            <Box
                                height={{ base: "320px", sm: "400px", md: "460px" }}
                                position="relative"
                                sx={{
                                    '.leaflet-container': {
                                        touchAction: { base: 'pan-y', md: 'auto' }
                                    }
                                }}
                            >
                                <MapContainer
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    style={{ height: "100%", width: "100%" }}
                                    scrollWheelZoom={true}
                                    dragging={true}
                                    touchZoom={true}
                                    doubleClickZoom={true}
                                    zoomControl={true}
                                    boxZoom={true}
                                    keyboard={false}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                        attribution="&copy; OpenStreetMap &copy; CARTO"
                                    />

                                    {vendorRouteData && showVendorRoute ? (
                                        <>
                                            <MapBoundsUpdater bounds={vendorRouteData.bounds} />
                                            <VendorRoute
                                                visits={vendorRouteData.visits}
                                                color={vendorColorMap[selectedVendor] || "#0e572b"}
                                            />
                                        </>
                                    ) : (
                                        <MapUpdater center={mapCenter} zoom={mapZoom} />
                                    )}

                                    <MapMarkers
                                        groupedVisits={groupsWithSequence}
                                        selectedVendor={selectedVendor}
                                        hoveredStore={hoveredStore}
                                        onMarkerClick={handleMarkerClick}
                                        showRoute={showVendorRoute && selectedVendor !== "all"}
                                        vendorColorMap={vendorColorMap}
                                    />
                                </MapContainer>
                            </Box>
                        </CardBody>
                    </Card>

                    {/* LISTADO DETALLADO DE VISITAS AGRUPADO POR DÍA */}
                    <Box w="full" pt={1}>
                        <Flex justify="space-between" align="center" mb={2.5} flexWrap="wrap" gap={2}>
                            <HStack spacing={1.5}>
                                <FiMapPin color="#0e572b" size={16} />
                                <Heading size={{ base: "xs", md: "sm" }} color="gray.800" fontWeight="850">
                                    {showVendorRoute && selectedVendor !== "all" ? (
                                        <>Recorrido Detallado de {selectedVendor}</>
                                    ) : (
                                        <>Registro Cronológico de Visitas</>
                                    )}
                                </Heading>
                            </HStack>
                            <Badge colorScheme="emerald" fontSize="11px" px={2} py={0.5} borderRadius="full" fontWeight="700">
                                {filteredGroups.length} resultado{filteredGroups.length !== 1 ? 's' : ''}
                            </Badge>
                        </Flex>

                        {/* Visitas agrupadas por día */}
                        <VStack spacing={{ base: 2.5, md: 3 }} align="stretch" w="full">
                            {groupedByDay.length === 0 ? (
                                <Card bg={cardBg} borderColor={borderColor} borderRadius="xl">
                                    <CardBody p={6} textAlign="center">
                                        <Text fontSize="sm" color="gray.600" fontWeight="bold">
                                            📭 No se encontraron visitas registradas con los filtros seleccionados
                                        </Text>
                                        <Button
                                            mt={3}
                                            colorScheme="emerald"
                                            size="xs"
                                            borderRadius="lg"
                                            onClick={clearFilters}
                                        >
                                            Restablecer Filtros
                                        </Button>
                                    </CardBody>
                                </Card>
                            ) : (
                                groupedByDay.map((dayGroup) => (
                                    <Box key={dayGroup.date} w="full">
                                        {/* Encabezado del día */}
                                        <HStack
                                            mb={2}
                                            p={2}
                                            bg={purpleHeaderBg}
                                            borderRadius="lg"
                                            spacing={2}
                                            border="1px solid"
                                            borderColor="purple.100"
                                        >
                                            <FiCalendar color="#7c3aed" size={14} />
                                            <Text fontWeight="800" fontSize="11px" color="purple.900">
                                                {dayGroup.date}
                                            </Text>
                                            <Badge colorScheme="purple" fontSize="9px" borderRadius="full" px={1.5}>
                                                {dayGroup.visits.length} visita{dayGroup.visits.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </HStack>

                                        {/* Lista de Tarjetas del día */}
                                        <VStack spacing={2.5} align="stretch" w="full" pl={{ base: 0, md: 2.5 }}>
                                            {dayGroup.visits.map((group) => (
                                                <Card
                                                    key={group.id}
                                                    bg={cardBg}
                                                    borderColor={selectedStore === group.id ? "green.500" : borderColor}
                                                    borderWidth={selectedStore === group.id ? "2px" : "1px"}
                                                    borderRadius="lg"
                                                    cursor="pointer"
                                                    transition="all 0.2s"
                                                    _hover={{
                                                        bg: hoverBg,
                                                        transform: { base: "none", md: "translateY(-1px)" },
                                                        boxShadow: "0 4px 14px rgba(0,0,0,0.04)"
                                                    }}
                                                    onClick={() => handleCardClick(group)}
                                                    onMouseEnter={() => setHoveredStore(group.id)}
                                                    onMouseLeave={() => setHoveredStore(null)}
                                                    w="full"
                                                >
                                                    <CardBody p={{ base: 2.5, md: 3 }}>
                                                        <VStack align="stretch" spacing={2}>
                                                            <HStack justify="space-between" flexWrap="wrap" gap={1.5}>
                                                                <HStack spacing={1.5} minW={0} flex={1}>
                                                                    {group.sequenceNumber && (
                                                                        <Badge colorScheme="emerald" fontSize="10px" borderRadius="md" px={1.5}>
                                                                            #{group.sequenceNumber}
                                                                        </Badge>
                                                                    )}
                                                                    <Heading size="xs" color="gray.850" fontWeight="800" isTruncated fontSize="12px">
                                                                        📍 {group.storeName}
                                                                    </Heading>
                                                                </HStack>
                                                                {group.in && group.out && (
                                                                    <Badge colorScheme="green" variant="solid" borderRadius="full" px={1.5} fontSize="9px">Completo</Badge>
                                                                )}
                                                                {group.in && !group.out && (
                                                                    <Badge colorScheme="orange" variant="solid" borderRadius="full" px={1.5} fontSize="9px">En Curso / Pendiente</Badge>
                                                                )}
                                                                {!group.in && group.out && (
                                                                    <Badge colorScheme="red" variant="solid" borderRadius="full" px={1.5} fontSize="9px">Sin Check-In</Badge>
                                                                )}
                                                            </HStack>

                                                            <SimpleGrid columns={{ base: 1, sm: group.in && group.out ? 2 : 1 }} spacing={2}>
                                                                {group.in && (
                                                                    <Box p={2} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.100">
                                                                        <HStack justify="space-between" mb={0.5} flexWrap="wrap" gap={1}>
                                                                            <Badge colorScheme="green" fontSize="9px" fontWeight="800">✓ CHECK IN</Badge>
                                                                            <Text fontSize="10px" fontWeight="800" color="green.900">
                                                                                🕐 {formatTime(group.in.createdAt)}
                                                                            </Text>
                                                                        </HStack>
                                                                        <Text fontSize="10px" color="gray.600">
                                                                            📅 {formatDateTime(group.in.createdAt)}
                                                                        </Text>
                                                                        <Text fontSize="10px" fontWeight="700" color="gray.800" mt={0.5} isTruncated>
                                                                            👤 {group.vendorName}
                                                                        </Text>
                                                                        {group.in.imageUrl && (
                                                                            <HStack mt={1.5} flexWrap="wrap" gap={1.5}>
                                                                                <Badge colorScheme="blue" fontSize="9px">
                                                                                    🖼️ Con Evidencia
                                                                                </Badge>
                                                                                <Text
                                                                                    fontSize="10px"
                                                                                    color="blue.600"
                                                                                    fontWeight="bold"
                                                                                    cursor="pointer"
                                                                                    textDecoration="underline"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        window.open(group.in.imageUrl, '_blank');
                                                                                    }}
                                                                                >
                                                                                    Ver foto adjunta
                                                                                </Text>
                                                                            </HStack>
                                                                        )}
                                                                    </Box>
                                                                )}

                                                                {group.out && (
                                                                    <Box p={2} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.100">
                                                                        <HStack justify="space-between" mb={0.5} flexWrap="wrap" gap={1}>
                                                                            <Badge colorScheme="red" fontSize="9px" fontWeight="800">✗ CHECK OUT</Badge>
                                                                            <Text fontSize="10px" fontWeight="800" color="red.900">
                                                                                🕐 {formatTime(group.out.createdAt)}
                                                                            </Text>
                                                                        </HStack>
                                                                        <Text fontSize="10px" color="gray.600">
                                                                            📅 {formatDateTime(group.out.createdAt)}
                                                                        </Text>
                                                                        <Text fontSize="10px" fontWeight="700" color="gray.800" mt={0.5} isTruncated>
                                                                            👤 {group.out.vendorName}
                                                                        </Text>
                                                                    </Box>
                                                                )}
                                                            </SimpleGrid>

                                                            {group.in && group.out && (
                                                                <HStack justify="space-between" pt={0.5}>
                                                                    <Text fontSize="10px" fontWeight="700" color="gray.600">
                                                                        ⏱️ Tiempo de permanencia:
                                                                    </Text>
                                                                    <Badge colorScheme="blue" fontSize="10px" px={1.5} py={0.2} borderRadius="md">
                                                                        {calculateDuration(group.in.createdAt, group.out.createdAt)}
                                                                    </Badge>
                                                                </HStack>
                                                            )}
                                                        </VStack>
                                                    </CardBody>
                                                </Card>
                                            ))}
                                        </VStack>
                                    </Box>
                                ))
                            )}
                        </VStack>
                    </Box>
                </VStack>
            </Box>
        </Box>
    );
}