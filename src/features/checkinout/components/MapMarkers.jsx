import { Marker, Popup } from "react-leaflet";
import { Box, Text, Badge } from "@chakra-ui/react";
import { formatDateTime } from "../utils/dateUtils";
import { createNumberedIcon, createPinIcon } from "../utils/iconsmap";

export default function MapMarkers({ groupedVisits, selectedVendor, hoveredStore, onMarkerClick, showRoute, vendorColorMap }) {
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
                const vendorName = group.in?.vendorName || group.out?.vendorName;
                const vendorColor = vendorColorMap[vendorName] || "#3b82f6";

                return (
                    <div key={group.id}>
                        {hasIn && (
                            <Marker
                                position={[group.in.latitude, group.in.longitude]}
                                icon={showSequence ? createNumberedIcon(group.sequenceNumber, vendorColor) : createPinIcon(vendorColor)}
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