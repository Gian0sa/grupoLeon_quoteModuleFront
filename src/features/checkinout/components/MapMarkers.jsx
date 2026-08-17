import { Marker, Popup } from "react-leaflet";
import { Box, Text, Badge, HStack } from "@chakra-ui/react";
import { formatDateTime } from "../utils/dateUtils";
import { createNumberedIcon, createPinIcon } from "../utils/iconsmap";

export default function MapMarkers({ groupedVisits, selectedVendor, hoveredStore, onMarkerClick, showRoute, vendorColorMap }) {
    const isVendorMatch = (vendorName) => {
        if (!selectedVendor || selectedVendor === "all") return true;
        if (!vendorName) return false;
        const cleanSel = String(selectedVendor).replace(/^\d+\.\s*/, "").toLowerCase().trim();
        const cleanVen = String(vendorName).replace(/^\d+\.\s*/, "").toLowerCase().trim();
        return cleanVen.includes(cleanSel) || cleanSel.includes(cleanVen) || vendorName.toLowerCase() === selectedVendor.toLowerCase();
    };

    return (
        <>
            {groupedVisits.map((group) => {
                const hasIn = group.in && isVendorMatch(group.in.vendorName);
                const hasOut = group.out && isVendorMatch(group.out.vendorName);

                const isHovered = hoveredStore === group.id;

                const showSequence = showRoute && selectedVendor !== "all" && group.sequenceNumber;
                const vendorName = group.in?.vendorName || group.out?.vendorName;
                const vendorColor = vendorColorMap[vendorName] || vendorColorMap[selectedVendor] || "#0e572b";

                return (
                    <div key={group.id}>
                        {hasIn && (
                            <Marker
                                position={[group.in.latitude, group.in.longitude]}
                                icon={showSequence ? createNumberedIcon(group.sequenceNumber, vendorColor) : createPinIcon(vendorColor, isHovered)}
                                eventHandlers={{
                                    click: () => onMarkerClick(group),
                                }}
                            >
                                <Popup maxWidth={260} className="custom-leaflet-popup">
                                    <Box p={2.5}>
                                        <HStack justify="space-between" mb={2} flexWrap="wrap" gap={1}>
                                            {showSequence ? (
                                                <Badge colorScheme="emerald" variant="solid" borderRadius="full" px={2} fontSize="10px">
                                                    Parada #{group.sequenceNumber}
                                                </Badge>
                                            ) : (
                                                <Badge colorScheme="green" variant="subtle" borderRadius="md" px={2} fontSize="10px">
                                                    ✓ CHECK IN
                                                </Badge>
                                            )}
                                        </HStack>

                                        <Text fontWeight="800" fontSize="13px" color="gray.900" mb={1} lineHeight="1.2">
                                            📍 {group.storeName}
                                        </Text>

                                        <Text fontSize="11px" fontWeight="700" color="gray.700" mb={0.5}>
                                            👤 {group.in.vendorName}
                                        </Text>

                                        <Text fontSize="10px" color="gray.500" mb={2}>
                                            🕐 {formatDateTime(group.in.createdAt)}
                                        </Text>

                                        {group.in.imageUrl && (
                                            <Box
                                                mt={2}
                                                borderRadius="xl"
                                                overflow="hidden"
                                                border="2px solid"
                                                borderColor="green.400"
                                                boxShadow="0 4px 10px rgba(0,0,0,0.1)"
                                            >
                                                <img
                                                    src={group.in.imageUrl}
                                                    alt="Evidencia Check-In"
                                                    style={{
                                                        width: "100%",
                                                        height: "110px",
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