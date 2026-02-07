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
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useVisitLogs } from "../hooks/queries/visitLogQueries";
import { BackButton } from "../../../components/BackButton";

// Icons (using Unicode symbols as replacements for lucide-react)
const SearchIcon = () => <span>🔍</span>;
const MapPinIcon = () => <span>📍</span>;
const ClockIcon = () => <span>🕐</span>;
const CalendarIcon = () => <span>📅</span>;
const ChevronDownIcon = () => <span>▼</span>;
const ChevronUpIcon = () => <span>▲</span>;
const FilterIcon = () => <span>🔽</span>;
const ImageIcon = () => <span>🖼️</span>;

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Iconos personalizados
const checkInIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const checkOutIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

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

// Componente para actualizar el centro del mapa
function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

// Componente para los marcadores
function MapMarkers({ groupedVisits, selectedVendor, hoveredStore, onMarkerClick }) {
    return (
        <>
            {groupedVisits.map((group, idx) => {
                const hasIn = group.in &&
                    (selectedVendor === "all" || group.in.vendorName === selectedVendor);
                const hasOut = group.out &&
                    (selectedVendor === "all" || group.out.vendorName === selectedVendor);

                const isHovered = hoveredStore === group.id;

                return (
                    <div key={group.id}>
                        {hasIn && (
                            <Marker
                                position={[group.in.latitude, group.in.longitude]}
                                icon={checkInIcon}
                                eventHandlers={{
                                    click: () => onMarkerClick(group),
                                }}
                            >
                                <Popup>
                                    <Box p={2}>
                                        <Text fontWeight="bold" color="green.600">
                                            ✓ CHECK IN
                                        </Text>
                                        <Text fontSize="sm" fontWeight="bold">{group.in.storeName}</Text>
                                        <Text fontSize="sm">👤 {group.in.vendorName}</Text>
                                        <Text fontSize="sm">
                                            🕐 {formatDateTime(group.in.createdAt)}
                                        </Text>
                                        {group.in.imageUrl && (
                                            <Text fontSize="xs" color="blue.500">
                                                <ImageIcon /> Con foto
                                            </Text>
                                        )}
                                    </Box>
                                </Popup>
                            </Marker>
                        )}

                        {hasOut && (
                            <Marker
                                position={[group.out.latitude, group.out.longitude]}
                                icon={checkOutIcon}
                                eventHandlers={{
                                    click: () => onMarkerClick(group),
                                }}
                            >
                                <Popup>
                                    <Box p={2}>
                                        <Text fontWeight="bold" color="red.600">
                                            ✗ CHECK OUT
                                        </Text>
                                        <Text fontSize="sm" fontWeight="bold">{group.out.storeName}</Text>
                                        <Text fontSize="sm">👤 {group.out.vendorName}</Text>
                                        <Text fontSize="sm">
                                            🕐 {formatDateTime(group.out.createdAt)}
                                        </Text>
                                    </Box>
                                </Popup>
                            </Marker>
                        )}

                        {hasIn && hasOut && (
                            <Polyline
                                positions={[
                                    [group.in.latitude, group.in.longitude],
                                    [group.out.latitude, group.out.longitude],
                                ]}
                                color={isHovered ? "#3182ce" : "#4299e1"}
                                weight={isHovered ? 4 : 2}
                                opacity={isHovered ? 0.9 : 0.6}
                                dashArray="5, 10"
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
}

export default function VisitLogsMapView() {
    const { data: visitLogs, isLoading, error } = useVisitLogs();
    const [selectedVendor, setSelectedVendor] = useState("all");
    const [mapCenter, setMapCenter] = useState([-12.0464, -77.0428]);
    const [mapZoom, setMapZoom] = useState(13);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const [showFilters, setShowFilters] = useState(true);
    const [hoveredStore, setHoveredStore] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);

    const cardBg = useColorModeValue("white", "gray.700");
    const borderColor = useColorModeValue("gray.200", "gray.600");
    const statBg = useColorModeValue("blue.50", "blue.900");
    const hoverBg = useColorModeValue("gray.50", "gray.600");

    // Agrupar visitas - nueva lógica
    const groupedVisits = useMemo(() => {
        if (!visitLogs || visitLogs.length === 0) return [];

        const sorted = [...visitLogs].sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );

        const groups = [];
        const processed = new Set();

        sorted.forEach((visit) => {
            if (processed.has(visit.id)) return;

            if (visit.type === "IN") {
                const matchingOut = sorted.find(v =>
                    !processed.has(v.id) &&
                    v.type === "OUT" &&
                    v.storeName === visit.storeName &&
                    v.vendorName === visit.vendorName &&
                    new Date(v.createdAt) > new Date(visit.createdAt) &&
                    Math.abs(new Date(v.createdAt) - new Date(visit.createdAt)) < 24 * 60 * 60 * 1000
                );

                groups.push({
                    id: `group-${visit.id}`,
                    storeName: visit.storeName,
                    vendorName: visit.vendorName,
                    in: visit,
                    out: matchingOut || null,
                });

                processed.add(visit.id);
                if (matchingOut) processed.add(matchingOut.id);
            } else if (visit.type === "OUT") {
                const hasMatchingIn = sorted.some(v =>
                    v.type === "IN" &&
                    v.storeName === visit.storeName &&
                    v.vendorName === visit.vendorName &&
                    new Date(v.createdAt) < new Date(visit.createdAt) &&
                    Math.abs(new Date(visit.createdAt) - new Date(v.createdAt)) < 24 * 60 * 60 * 1000
                );

                if (!hasMatchingIn) {
                    groups.push({
                        id: `group-${visit.id}`,
                        storeName: visit.storeName,
                        vendorName: visit.vendorName,
                        in: null,
                        out: visit,
                    });
                    processed.add(visit.id);
                }
            }
        });

        return groups;
    }, [visitLogs]);

    const filteredGroups = useMemo(() => {
        return groupedVisits.filter(group => {
            const vendorMatch = selectedVendor === "all" ||
                group.vendorName === selectedVendor;

            const searchMatch = searchTerm === "" ||
                group.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                group.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

            return vendorMatch && searchMatch;
        });
    }, [groupedVisits, selectedVendor, searchTerm]);

    const stats = useMemo(() => {
        const totalVisits = filteredGroups.length;
        const completedVisits = filteredGroups.filter(g => g.in && g.out).length;
        const pendingCheckOut = filteredGroups.filter(g => g.in && !g.out).length;
        const orphanCheckOut = filteredGroups.filter(g => !g.in && g.out).length;

        let totalDuration = 0;
        let visitCount = 0;
        filteredGroups.forEach(g => {
            if (g.in && g.out) {
                const diff = new Date(g.in.createdAt) - new Date(g.out.createdAt);
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
        return [...new Set(visitLogs?.map(v => v.vendorName) || [])];
    }, [visitLogs]);

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

                {/* Filtros */}
                <Card bg={cardBg} borderColor={borderColor}>
                    <CardBody p={{ base: 3, md: 4 }}>
                        <VStack align="stretch" spacing={4}>
                            <Flex justify="space-between" align="center">
                                <Heading size={{ base: "xs", md: "sm" }}>
                                    <FilterIcon /> Filtros
                                </Heading>
                                <IconButton
                                    size="sm"
                                    icon={showFilters ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant="ghost"
                                />
                            </Flex>

                            <Collapse in={showFilters}>
                                <VStack spacing={3} align="stretch">
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <SearchIcon />
                                        </InputLeftElement>
                                        <Input
                                            placeholder="Buscar tienda o vendedor..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            fontSize={{ base: "sm", md: "md" }}
                                        />
                                    </InputGroup>

                                    <Select
                                        value={selectedVendor}
                                        onChange={(e) => setSelectedVendor(e.target.value)}
                                        fontSize={{ base: "sm", md: "md" }}
                                    >
                                        <option value="all">👥 Todos los vendedores</option>
                                        {vendors.map((vendor) => (
                                            <option key={vendor} value={vendor}>
                                                {vendor}
                                            </option>
                                        ))}
                                    </Select>
                                </VStack>
                            </Collapse>
                        </VStack>
                    </CardBody>
                </Card>

                {/* Mapa con scroll bloqueado en mobile */}
                <Card bg={cardBg} borderColor={borderColor}>
                    <CardBody p={0}>
                        <Box
                            height={{ base: "300px", md: "500px" }}
                            borderRadius="lg"
                            overflow="hidden"
                            position="relative"
                            sx={{
                                // Bloquear interacción táctil en mobile
                                '.leaflet-container': {
                                    touchAction: { base: 'pan-y', md: 'auto' }
                                }
                            }}
                        >
                            <MapContainer
                                center={mapCenter}
                                zoom={mapZoom}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={false}
                                dragging={false}
                                touchZoom={false}
                                doubleClickZoom={false}
                                zoomControl={false}
                                boxZoom={false}
                                keyboard={false}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapUpdater center={mapCenter} zoom={mapZoom} />
                                <MapMarkers
                                    groupedVisits={filteredGroups}
                                    selectedVendor={selectedVendor}
                                    hoveredStore={hoveredStore}
                                    onMarkerClick={handleMarkerClick}
                                />
                            </MapContainer>
                        </Box>
                    </CardBody>
                </Card>

                {/* Lista de visitas */}
                <Box w="full">
                    <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
                        <Heading size={{ base: "sm", md: "md" }}>Detalle de Visitas</Heading>
                        <Badge colorScheme="blue" fontSize={{ base: "sm", md: "md" }} p={2} borderRadius="md">
                            {filteredGroups.length} resultados
                        </Badge>
                    </HStack>

                    <VStack spacing={{ base: 3, md: 4 }} align="stretch" w="full">
                        {filteredGroups.map((group) => (
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
                                            <Heading size={{ base: "xs", md: "sm" }} isTruncated maxW={{ base: "200px", md: "none" }}>
                                                <MapPinIcon /> {group.storeName}
                                            </Heading>
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
                                                bg={useColorModeValue("green.50", "green.900")}
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
                                                <Text fontSize="xs" mt={1} isTruncated>👤 {group.in.vendorName}</Text>
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
                                                bg={useColorModeValue("red.50", "red.900")}
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
                                                        {calculateDuration(group.out.createdAt, group.in.createdAt)}
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
            </VStack>
        </Box>
    );
}