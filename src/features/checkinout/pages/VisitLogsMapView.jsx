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
    Select,
    Grid,
    Button,
    ButtonGroup,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    Icon,
    Tooltip,
    Input,
    InputGroup,
    InputLeftElement,
    Collapse,
    IconButton,
    Flex,
    SimpleGrid,
} from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useVisitLogs } from "../hooks/queries/visitLogQueries";
import { BackButton } from "../../../components/BackButton";

const SearchIcon = () => <span>🔍</span>;
const MapPinIcon = () => <span>📍</span>;
const ClockIcon = () => <span>🕐</span>;
const CalendarIcon = () => <span>📅</span>;
const ChevronDownIcon = () => <span>▼</span>;
const ChevronUpIcon = () => <span>▲</span>;
const FilterIcon = () => <span>🔽</span>;
const ImageIcon = () => <span>🖼️</span>;
const RouteIcon = () => <span>🛣️</span>;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const checkInIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const createNumberedIcon = (number, color = "#2563eb") => {
    return L.divIcon({
        className: 'custom-numbered-icon',
        html: `
            <div style="
                background-color: ${color};
                color: white;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                border: 3px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            ">
                ${number}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
};

const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "N/A";
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

const getToday = () => {
    const today = new Date();
    const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return localDate;
};

const getYesterday = () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 0, 0, 0, 0);
    return yesterday;
};

const getLastWeek = () => {
    const today = new Date();
    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, 0, 0, 0, 0);
    return lastWeek;
};

const getLastMonth = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate(), 0, 0, 0, 0);
    return lastMonth;
};

const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeToLocalMidnight = (dateString) => {
    const date = new Date(dateString);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

function MapBoundsUpdater({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

function VendorRoute({ visits, color = "#3b82f6" }) {
    if (!visits || visits.length < 2) return null;

    const positions = visits.map(v => [v.latitude, v.longitude]);

    return (
        <>
            <Polyline
                positions={positions}
                color={color}
                weight={3}
                opacity={0.7}
            />

            <Polyline
                positions={positions}
                color={color}
                weight={3}
                opacity={0.7}
                dashArray="10, 15"
            />
        </>
    );
}

function MapMarkers({ groupedVisits, selectedVendor, hoveredStore, onMarkerClick, showRoute }) {
    const vendorColors = {
        default: "#3b82f6",
        colors: ["#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"]
    };

    return (
        <>
            {groupedVisits.map((group, idx) => {
                const hasIn = group.in &&
                    (selectedVendor === "all" || group.in.vendorName === selectedVendor);
                const hasOut = group.out &&
                    (selectedVendor === "all" || group.out.vendorName === selectedVendor);

                const isHovered = hoveredStore === group.id;

                const showSequence = showRoute && selectedVendor !== "all" && group.sequenceNumber;
                const vendorColor = vendorColors.colors[idx % vendorColors.colors.length];

                return (
                    <div key={group.id}>
                        {hasIn && (
                            <Marker
                                position={[group.in.latitude, group.in.longitude]}
                                icon={showSequence ? createNumberedIcon(group.sequenceNumber, vendorColor) : checkInIcon}
                                eventHandlers={{
                                    click: () => onMarkerClick(group),
                                }}
                            >
                                <Popup maxWidth={250}>
                                    <Box p={2}>
                                        {showSequence && (
                                            <Badge colorScheme="blue" mb={2}>
                                                Parada #{group.sequenceNumber}
                                            </Badge>
                                        )}
                                        <Text fontWeight="bold" color="green.600" mb={2}>
                                            ✓ CHECK IN
                                        </Text>
                                        <Text fontSize="sm" fontWeight="bold">{group.storeName}</Text>
                                        <Text fontSize="sm">👤 {group.in.vendorName}</Text>
                                        <Text fontSize="sm" mb={2}>
                                            🕐 {formatDateTime(group.in.createdAt)}
                                        </Text>
                                        {group.in.imageUrl && (
                                            <Box
                                                mt={2}
                                                borderRadius="md"
                                                overflow="hidden"
                                                border="2px solid"
                                                borderColor="green.300"
                                            >
                                                <img
                                                    src={group.in.imageUrl}
                                                    alt="Check-In"
                                                    style={{
                                                        width: "100%",
                                                        height: "120px",
                                                        objectFit: "cover",
                                                        display: "block"
                                                    }}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Popup>
                            </Marker>
                        )}
                    </div>
                );
            })}
        </>
    );
}

export default function VisitLogsMapView() {
    const { data, isLoading, error } = useVisitLogs();
    const visitLogs = data?.visits || [];

    const [selectedVendor, setSelectedVendor] = useState("all");
    const [mapCenter, setMapCenter] = useState([-12.0464, -77.0428]);
    const [mapZoom, setMapZoom] = useState(13);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const [showFilters, setShowFilters] = useState(true);
    const [hoveredStore, setHoveredStore] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);
    const [showVendorRoute, setShowVendorRoute] = useState(false);

    const today = formatDateForInput(getToday());

    const [datePreset, setDatePreset] = useState("today");
    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);

    const [statusFilter, setStatusFilter] = useState("all");

    const cardBg = useColorModeValue("white", "gray.700");
    const borderColor = useColorModeValue("gray.200", "gray.600");
    const statBg = useColorModeValue("blue.50", "blue.900");
    const hoverBg = useColorModeValue("gray.50", "gray.600");
    const purpleBg = useColorModeValue("purple.100", "purple.800");
    const purpleBorder = useColorModeValue("purple.300", "purple.600");
    const purpleText = useColorModeValue("purple.700", "purple.200");
    const blueBg = useColorModeValue("blue.50", "blue.900");
    const greenBg = useColorModeValue("green.50", "green.900");
    const redBg = useColorModeValue("red.50", "red.900");
    const purpleHeaderBg = useColorModeValue("purple.50", "purple.900");

    const groupedVisits = useMemo(() => {
        return visitLogs;
    }, [visitLogs]);

    const handleDatePresetChange = (preset) => {
        setDatePreset(preset);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

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
                setDateFrom(formatDateForInput(getLastMonth()));
                setDateTo(formatDateForInput(getToday()));
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
        return groupedVisits.filter(group => {
            const vendorMatch = selectedVendor === "all" ||
                group.vendorName === selectedVendor;

            const searchMatch = searchTerm === "" ||
                group.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

            let dateMatch = true;
            if (dateFrom || dateTo) {
                const visitDate = normalizeToLocalMidnight(group.in?.createdAt || group.out?.createdAt);

                if (dateFrom) {
                    const fromDate = normalizeToLocalMidnight(dateFrom + "T00:00:00");
                    if (visitDate < fromDate) dateMatch = false;
                }

                if (dateTo) {
                    const toDate = normalizeToLocalMidnight(dateTo + "T23:59:59");
                    if (visitDate > toDate) dateMatch = false;
                }
            }

            let statusMatch = true;
            if (statusFilter !== "all") {
                if (statusFilter === "completed") {
                    statusMatch = group.in && group.out;
                } else if (statusFilter === "pending") {
                    statusMatch = group.in && !group.out;
                } else if (statusFilter === "orphan") {
                    statusMatch = !group.in && group.out;
                }
            }

            return vendorMatch && searchMatch && dateMatch && statusMatch;
        });
    }, [groupedVisits, selectedVendor, searchTerm, dateFrom, dateTo, statusFilter]);

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
        const totalVisits = completedVisits + pendingCheckOut + orphanCheckOut;

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
            totalVisits,
            completedVisits,
            pendingCheckOut,
            orphanCheckOut,
            avgDuration: visitCount > 0 ? `${avgHours}h ${avgMinutes}m` : "N/A",
        };
    }, [filteredGroups]);

    const vendors = useMemo(() => {
        return [...new Set(visitLogs?.map(v => v.vendorName).filter(Boolean))];
    }, [visitLogs]);

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
        setSearchTerm("");
        setDatePreset("all");
        setDateFrom("");
        setDateTo("");
        setStatusFilter("all");
        setShowVendorRoute(false);
    };

    if (isLoading) {
        return (
            <Box textAlign="center" py={10}>
                <Spinner size="xl" color="blue.500" thickness="4px" />
                <Text mt={4} fontSize="lg">Cargando visitas...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box textAlign="center" py={10}>
                <Text color="red.500" fontSize="lg">⚠️ Error al cargar las visitas</Text>
            </Box>
        );
    }

    return (
        <Box p={{ base: 3, md: 6 }} w="full" maxW="100vw" overflowX="hidden">
            <VStack spacing={{ base: 4, md: 6 }} align="stretch" w="full">
                <Flex
                    bg="green.700"
                    color="white"
                    align="center"
                    justify="center"
                    w="100%"
                    minH={{ base: "44px", md: "56px" }}
                    px={{ base: 2, md: 4 }}
                    borderRadius={{ base: "md", md: "xl" }}
                    position="relative"
                >
                    <Box position="absolute" left={2}>
                        <BackButton color="white" />
                    </Box>

                    <Heading
                        textAlign="center"
                        fontSize={{ base: "md", sm: "lg", md: "xl" }}
                        noOfLines={1}
                    >
                        Mapa de Visitas
                    </Heading>
                </Flex>
                {/* Filtros */}
                <Card bg={cardBg} borderColor={borderColor}>
                    <CardBody p={{ base: 3, md: 4 }}>
                        <VStack align="stretch" spacing={4}>
                            <Flex justify="space-between" align="center">
                                <Heading size={{ base: "xs", md: "sm" }}>
                                    <FilterIcon /> Filtros
                                </Heading>
                                <HStack>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={clearFilters}
                                        fontSize={{ base: "xs", md: "sm" }}
                                    >
                                        Limpiar
                                    </Button>
                                    <IconButton
                                        size="sm"
                                        icon={showFilters ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                        onClick={() => setShowFilters(!showFilters)}
                                        variant="ghost"
                                    />
                                </HStack>
                            </Flex>

                            <Collapse in={showFilters}>
                                <VStack spacing={4} align="stretch">

                                    {/* Filtros en grid responsivo */}
                                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                        {/* Filtro de vendedor */}
                                        <Box>
                                            <Text fontSize="sm" fontWeight="medium" mb={2}>
                                                👥 Vendedor
                                            </Text>
                                            <Select
                                                value={selectedVendor}
                                                onChange={(e) => setSelectedVendor(e.target.value)}
                                                fontSize={{ base: "sm", md: "md" }}
                                            >
                                                <option value="all">Todos los vendedores</option>
                                                {vendors.map((vendor) => (
                                                    <option key={vendor} value={vendor}>
                                                        {vendor}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Box>

                                        {/* Filtro de estado */}
                                        <Box>
                                            <Text fontSize="sm" fontWeight="medium" mb={2}>
                                                📊 Estado
                                            </Text>
                                            <Select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                fontSize={{ base: "sm", md: "md" }}
                                            >
                                                <option value="all">Todas las visitas</option>
                                                <option value="completed">✅ Completas</option>
                                                <option value="pending">⏳ Pendientes</option>
                                            </Select>
                                        </Box>
                                    </SimpleGrid>

                                    <Divider />

                                    {/* Filtros de fecha */}
                                    <Box>
                                        <Text fontSize="sm" fontWeight="bold" mb={3}>
                                            📅 Filtrar por Fecha
                                        </Text>

                                        {/* Presets de fecha */}
                                        <ButtonGroup size="sm" isAttached variant="outline" mb={3} flexWrap="wrap">
                                            <Button
                                                colorScheme={datePreset === "today" ? "blue" : "gray"}
                                                onClick={() => handleDatePresetChange("today")}
                                            >
                                                Hoy
                                            </Button>
                                            <Button
                                                colorScheme={datePreset === "all" ? "blue" : "gray"}
                                                onClick={() => handleDatePresetChange("all")}
                                            >
                                                Todas
                                            </Button>
                                            <Button
                                                colorScheme={datePreset === "yesterday" ? "blue" : "gray"}
                                                onClick={() => handleDatePresetChange("yesterday")}
                                            >
                                                Ayer
                                            </Button>
                                            <Button
                                                colorScheme={datePreset === "last7days" ? "blue" : "gray"}
                                                onClick={() => handleDatePresetChange("last7days")}
                                            >
                                                Últimos 7 días
                                            </Button>
                                            <Button
                                                colorScheme={datePreset === "last30days" ? "blue" : "gray"}
                                                onClick={() => handleDatePresetChange("last30days")}
                                            >
                                                Último mes
                                            </Button>
                                            <Button
                                                colorScheme={datePreset === "custom" ? "blue" : "gray"}
                                                onClick={() => setDatePreset("custom")}
                                            >
                                                Personalizado
                                            </Button>
                                        </ButtonGroup>

                                        {/* Rango de fechas personalizado */}
                                        {datePreset === "custom" && (
                                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                                <Box>
                                                    <Text fontSize="xs" mb={1}>Desde:</Text>
                                                    <Input
                                                        type="date"
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        size="sm"
                                                    />
                                                </Box>
                                                <Box>
                                                    <Text fontSize="xs" mb={1}>Hasta:</Text>
                                                    <Input
                                                        type="date"
                                                        value={dateTo}
                                                        onChange={(e) => setDateTo(e.target.value)}
                                                        size="sm"
                                                    />
                                                </Box>
                                            </SimpleGrid>
                                        )}

                                        {/* Mostrar rango activo */}
                                        {(dateFrom || dateTo) && (
                                            <Box
                                                mt={2}
                                                p={3}
                                                bg={purpleBg}
                                                borderRadius="md"
                                                borderWidth="1px"
                                                borderColor={purpleBorder}
                                            >
                                                <HStack spacing={2} justify="center" flexWrap="wrap">
                                                    <Text fontSize="xs" fontWeight="bold" color={purpleText}>
                                                        📆 Período:
                                                    </Text>
                                                    <Badge colorScheme="purple" fontSize="xs">
                                                        {dateFrom || "..."}
                                                    </Badge>
                                                    <Text fontSize="xs" fontWeight="bold">→</Text>
                                                    <Badge colorScheme="purple" fontSize="xs">
                                                        {dateTo || "..."}
                                                    </Badge>
                                                </HStack>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Control de ruta del vendedor */}
                                    {selectedVendor !== "all" && (
                                        <HStack
                                            p={3}
                                            bg={blueBg}
                                            borderRadius="md"
                                            justify="space-between"
                                        >
                                            <HStack>
                                                <RouteIcon />
                                                <Text fontSize="sm" fontWeight="medium">
                                                    Mostrar ruta del vendedor
                                                </Text>
                                            </HStack>
                                            <Button
                                                size="sm"
                                                colorScheme={showVendorRoute ? "blue" : "gray"}
                                                onClick={() => setShowVendorRoute(!showVendorRoute)}
                                            >
                                                {showVendorRoute ? "Activada" : "Desactivada"}
                                            </Button>
                                        </HStack>
                                    )}

                                    {/* Info de la ruta */}
                                    {vendorRouteData && showVendorRoute && (
                                        <Card bg={greenBg}>
                                            <CardBody p={3}>
                                                <VStack align="stretch" spacing={2}>
                                                    <Text fontSize="sm" fontWeight="bold">
                                                        📍 Ruta de {selectedVendor}
                                                    </Text>
                                                    <HStack spacing={4} flexWrap="wrap">
                                                        <Badge colorScheme="blue">
                                                            {vendorRouteData.visits.length} paradas
                                                        </Badge>
                                                        <Text fontSize="xs">
                                                            Los números en el mapa muestran el orden cronológico
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

                {/* Estadísticas */}
                <SimpleGrid columns={{ base: 2, md: 2, lg: 4 }} spacing={{ base: 2, md: 4 }} w="full">
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Total Visitas</StatLabel>
                                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>{stats.totalVisits}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Registradas</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Completadas</StatLabel>
                                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>{stats.completedVisits}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Con Check-In/Out</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Pendientes</StatLabel>
                                <StatNumber fontSize={{ base: "xl", md: "2xl" }}>{stats.pendingCheckOut}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Sin Check-Out</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card bg={statBg} borderColor={borderColor}>
                        <CardBody p={{ base: 3, md: 4 }}>
                            <Stat>
                                <StatLabel fontSize={{ base: "xs", md: "sm" }}>Duración Promedio</StatLabel>
                                <StatNumber fontSize={{ base: "md", md: "lg" }}>{stats.avgDuration}</StatNumber>
                                <StatHelpText fontSize={{ base: "xs", md: "sm" }}>Por visita</StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                {/* Mapa */}
                <Card bg={cardBg} borderColor={borderColor}>
                    <CardBody p={0}>
                        <Box
                            height={{ base: "300px", md: "500px" }}
                            borderRadius="lg"
                            overflow="hidden"
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
                                        <VendorRoute visits={vendorRouteData.visits} />
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
                                />
                            </MapContainer>
                        </Box>
                    </CardBody>
                </Card>

                {/* Lista de visitas agrupadas por día */}
                <Box w="full">
                    <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
                        <Heading size={{ base: "sm", md: "md" }}>
                            {showVendorRoute && selectedVendor !== "all" ? (
                                <>Recorrido de {selectedVendor}</>
                            ) : (
                                <>Detalle de Visitas</>
                            )}
                        </Heading>
                        <Badge colorScheme="blue" fontSize={{ base: "sm", md: "md" }} p={2} borderRadius="md">
                            {filteredGroups.length} resultado{filteredGroups.length !== 1 ? 's' : ''}
                        </Badge>
                    </HStack>

                    {/* Visitas agrupadas por día */}
                    <VStack spacing={{ base: 4, md: 5 }} align="stretch" w="full">
                        {groupedByDay.length === 0 ? (
                            <Card bg={cardBg} borderColor={borderColor}>
                                <CardBody p={8} textAlign="center">
                                    <Text fontSize="lg" color="gray.500">
                                        📭 No se encontraron visitas con los filtros seleccionados
                                    </Text>
                                    <Button
                                        mt={4}
                                        colorScheme="blue"
                                        size="sm"
                                        onClick={clearFilters}
                                    >
                                        Limpiar filtros
                                    </Button>
                                </CardBody>
                            </Card>
                        ) : (
                            groupedByDay.map((dayGroup) => (
                                <Box key={dayGroup.date} w="full">
                                    {/* Encabezado de día */}
                                    <HStack
                                        mb={3}
                                        p={2}
                                        bg={purpleHeaderBg}
                                        borderRadius="md"
                                        spacing={3}
                                    >
                                        <CalendarIcon />
                                        <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
                                            {dayGroup.date}
                                        </Text>
                                        <Badge colorScheme="purple" fontSize="xs">
                                            {dayGroup.visits.length} visita{dayGroup.visits.length !== 1 ? 's' : ''}
                                        </Badge>
                                    </HStack>

                                    {/* Visitas del día */}
                                    <VStack spacing={{ base: 3, md: 4 }} align="stretch" w="full" pl={{ base: 0, md: 4 }}>
                                        {dayGroup.visits.map((group) => (
                                            <Card
                                                key={group.id}
                                                bg={cardBg}
                                                borderColor={selectedStore === group.id ? "blue.500" : borderColor}
                                                borderWidth={selectedStore === group.id ? "2px" : "1px"}
                                                cursor="pointer"
                                                transition="all 0.2s"
                                                _hover={{
                                                    bg: hoverBg,
                                                    transform: { base: "none", md: "translateY(-2px)" },
                                                    shadow: "md"
                                                }}
                                                onClick={() => handleCardClick(group)}
                                                onMouseEnter={() => setHoveredStore(group.id)}
                                                onMouseLeave={() => setHoveredStore(null)}
                                                w="full"
                                            >
                                                <CardBody p={{ base: 3, md: 4 }}>
                                                    <VStack align="stretch" spacing={3}>
                                                        <HStack justify="space-between" flexWrap="wrap" gap={2}>
                                                            <HStack>
                                                                {group.sequenceNumber && (
                                                                    <Badge colorScheme="blue" fontSize="md">
                                                                        #{group.sequenceNumber}
                                                                    </Badge>
                                                                )}
                                                                <Heading size={{ base: "xs", md: "sm" }} isTruncated maxW={{ base: "200px", md: "none" }}>
                                                                    <MapPinIcon /> {group.storeName}
                                                                </Heading>
                                                            </HStack>
                                                            {group.in && group.out && (
                                                                <Badge colorScheme="green" fontSize={{ base: "xs", md: "sm" }}>Completo</Badge>
                                                            )}
                                                            {group.in && !group.out && (
                                                                <Badge colorScheme="orange" fontSize={{ base: "xs", md: "sm" }}>Pendiente</Badge>
                                                            )}
                                                            {!group.in && group.out && (
                                                                <Badge colorScheme="red" fontSize={{ base: "xs", md: "sm" }}>Sin Check-In</Badge>
                                                            )}
                                                        </HStack>

                                                        {group.in && (
                                                            <Box
                                                                p={{ base: 2, md: 3 }}
                                                                bg={greenBg}
                                                                borderRadius="md"
                                                            >
                                                                <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
                                                                    <Badge colorScheme="green" fontSize={{ base: "xs", md: "sm" }}>✓ CHECK IN</Badge>
                                                                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold">
                                                                        <ClockIcon /> {formatTime(group.in.createdAt)}
                                                                    </Text>
                                                                </HStack>
                                                                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                                                    <CalendarIcon /> {formatDateTime(group.in.createdAt)}
                                                                </Text>
                                                                <Text fontSize="xs" mt={1} isTruncated>👤 {group.vendorName}</Text>
                                                                {group.in.imageUrl && (
                                                                    <HStack mt={2} flexWrap="wrap" gap={2}>
                                                                        <Badge colorScheme="blue" fontSize="xs">
                                                                            <ImageIcon /> Con foto
                                                                        </Badge>
                                                                        <Text
                                                                            fontSize="xs"
                                                                            color="blue.500"
                                                                            cursor="pointer"
                                                                            textDecoration="underline"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(group.in.imageUrl, '_blank');
                                                                            }}
                                                                        >
                                                                            Ver imagen
                                                                        </Text>
                                                                    </HStack>
                                                                )}
                                                            </Box>
                                                        )}

                                                        {group.out && (
                                                            <Box
                                                                p={{ base: 2, md: 3 }}
                                                                bg={redBg}
                                                                borderRadius="md"
                                                            >
                                                                <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
                                                                    <Badge colorScheme="red" fontSize={{ base: "xs", md: "sm" }}>✗ CHECK OUT</Badge>
                                                                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold">
                                                                        <ClockIcon /> {formatTime(group.out.createdAt)}
                                                                    </Text>
                                                                </HStack>
                                                                <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                                                    <CalendarIcon /> {formatDateTime(group.out.createdAt)}
                                                                </Text>
                                                                <Text fontSize="xs" mt={1} isTruncated>👤 {group.out.vendorName}</Text>
                                                            </Box>
                                                        )}

                                                        {group.in && group.out && (
                                                            <>
                                                                <Divider />
                                                                <HStack justify="center" flexWrap="wrap" gap={2}>
                                                                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold">
                                                                        ⏱️ Duración:
                                                                    </Text>
                                                                    <Badge colorScheme="blue" fontSize={{ base: "sm", md: "md" }} p={2}>
                                                                        {calculateDuration(group.in.createdAt, group.out.createdAt)}
                                                                    </Badge>
                                                                </HStack>
                                                            </>
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
    );
}