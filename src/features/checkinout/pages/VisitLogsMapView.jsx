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
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useVisitLogs } from "../hooks/queries/visitLogQueries";

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Iconos personalizados para Check-In y Check-Out
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

// Función para formatear fecha y hora
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

// Función para obtener solo la hora
const formatTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Función para calcular duración entre check-in y check-out
const calculateDuration = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return "N/A";
  const diff = new Date(checkOut) - new Date(checkIn);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Componente para renderizar los marcadores
function MapMarkers({ groupedVisits, selectedVendor }) {
  return (
    <>
      {Object.values(groupedVisits).map((group, idx) => {
        const hasIn = group.in && 
          (selectedVendor === "all" || group.in.vendorName === selectedVendor);
        const hasOut = group.out && 
          (selectedVendor === "all" || group.out.vendorName === selectedVendor);

        return (
          <div key={idx}>
            {/* Marcador Check-In */}
            {hasIn && (
              <Marker
                position={[group.in.latitude, group.in.longitude]}
                icon={checkInIcon}
              >
                <Popup>
                  <Box p={2}>
                    <Text fontWeight="bold" color="green.600">
                      CHECK IN
                    </Text>
                    <Text fontSize="sm">{group.in.storeName}</Text>
                    <Text fontSize="sm">Vendedor: {group.in.vendorName}</Text>
                    <Text fontSize="sm">
                      {formatDateTime(group.in.createdAt)}
                    </Text>
                  </Box>
                </Popup>
              </Marker>
            )}

            {/* Marcador Check-Out */}
            {hasOut && (
              <Marker
                position={[group.out.latitude, group.out.longitude]}
                icon={checkOutIcon}
              >
                <Popup>
                  <Box p={2}>
                    <Text fontWeight="bold" color="red.600">
                      CHECK OUT
                    </Text>
                    <Text fontSize="sm">{group.out.storeName}</Text>
                    <Text fontSize="sm">Vendedor: {group.out.vendorName}</Text>
                    <Text fontSize="sm">
                      {formatDateTime(group.out.createdAt)}
                    </Text>
                  </Box>
                </Popup>
              </Marker>
            )}

            {/* Línea conectando IN y OUT */}
            {hasIn && hasOut && (
              <Polyline
                positions={[
                  [group.in.latitude, group.in.longitude],
                  [group.out.latitude, group.out.longitude],
                ]}
                color="blue"
                weight={2}
                opacity={0.6}
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
  const [mapCenter, setMapCenter] = useState([-12.0464, -77.0428]); // Lima, Perú

  const cardBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Agrupar visitas por tienda (IN y OUT juntos)
  const groupedVisits = visitLogs?.reduce((acc, visit) => {
    const key = `${visit.storeName}-${new Date(visit.createdAt).toDateString()}`;
    if (!acc[key]) {
      acc[key] = { in: null, out: null, storeName: visit.storeName };
    }
    if (visit.type === "IN") {
      acc[key].in = visit;
    } else {
      acc[key].out = visit;
    }
    return acc;
  }, {}) || {};

  // Filtrar por vendedor
  const filteredVisits = selectedVendor === "all" 
    ? visitLogs 
    : visitLogs?.filter(v => v.vendorName === selectedVendor);

  // Obtener lista única de vendedores
  const vendors = [...new Set(visitLogs?.map(v => v.vendorName) || [])];

  // Centrar el mapa en la primera visita
  useEffect(() => {
    if (filteredVisits && filteredVisits.length > 0) {
      const firstVisit = filteredVisits[0];
      setMapCenter([firstVisit.latitude, firstVisit.longitude]);
    }
  }, [filteredVisits]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Cargando visitas...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">Error al cargar las visitas</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="lg">Mapa de Visitas</Heading>
          <Select
            maxW="300px"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
          >
            <option value="all">Todos los vendedores</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </Select>
        </HStack>

        {/* Mapa */}
        <Box height="500px" borderRadius="lg" overflow="hidden" border="1px" borderColor={borderColor}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Marcadores y líneas */}
            <MapMarkers groupedVisits={groupedVisits} selectedVendor={selectedVendor} />
          </MapContainer>
        </Box>

        {/* Lista de visitas agrupadas */}
        <Box>
          <Heading size="md" mb={4}>
            Detalle de Visitas
          </Heading>
          <Grid templateColumns="repeat(auto-fill, minmax(350px, 1fr))" gap={4}>
            {Object.values(groupedVisits)
              .filter(group => {
                if (selectedVendor === "all") return true;
                return (group.in?.vendorName === selectedVendor) || 
                       (group.out?.vendorName === selectedVendor);
              })
              .map((group, idx) => (
                <Card key={idx} bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <Heading size="sm">{group.storeName}</Heading>
                      
                      {group.in && (
                        <Box>
                          <HStack>
                            <Badge colorScheme="green">CHECK IN</Badge>
                            <Text fontSize="sm" fontWeight="bold">
                              {formatTime(group.in.createdAt)}
                            </Text>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {formatDateTime(group.in.createdAt)}
                          </Text>
                          <Text fontSize="xs">Vendedor: {group.in.vendorName}</Text>
                        </Box>
                      )}

                      {group.out && (
                        <>
                          <Divider />
                          <Box>
                            <HStack>
                              <Badge colorScheme="red">CHECK OUT</Badge>
                              <Text fontSize="sm" fontWeight="bold">
                                {formatTime(group.out.createdAt)}
                              </Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.500">
                              {formatDateTime(group.out.createdAt)}
                            </Text>
                            <Text fontSize="xs">Vendedor: {group.out.vendorName}</Text>
                          </Box>
                        </>
                      )}

                      {group.in && group.out && (
                        <>
                          <Divider />
                          <HStack>
                            <Text fontSize="sm" fontWeight="bold">
                              Duración:
                            </Text>
                            <Badge colorScheme="blue">
                              {calculateDuration(group.in.createdAt, group.out.createdAt)}
                            </Badge>
                          </HStack>
                        </>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              ))}
          </Grid>
        </Box>
      </VStack>
    </Box>
  );
}