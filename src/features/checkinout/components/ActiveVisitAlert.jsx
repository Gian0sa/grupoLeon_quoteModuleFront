import { Box, Flex, Text } from "@chakra-ui/react";

export function ActiveVisitAlert({ activeVisit }) {
    if (!activeVisit) return null;

    // Tres situaciones distintas que antes se veían casi igual:
    // confirmada en servidor, pendiente de subir, o rechazada y a la espera de
    // que alguien la concilie.
    const needsReview = activeVisit.needsReview || activeVisit.status === "NEEDS_REVIEW";
    const tone = needsReview ? "red" : activeVisit.isLocal ? "yellow" : "orange";

    const titulo = needsReview ? (
        <>
            Tu <strong>Check-In en {activeVisit.storeName}</strong> necesita revisión
        </>
    ) : activeVisit.isLocal ? (
        <>
            Tienes un <strong>Check-In sin enviar</strong> en{" "}
            <strong>{activeVisit.storeName}</strong>
        </>
    ) : (
        <>
            Tienes un <strong>Check-In activo</strong> en{" "}
            <strong>{activeVisit.storeName}</strong>
        </>
    );

    const detalle = needsReview
        ? activeVisit.errorMessage || "Quedó guardado. Puedes reintentarlo desde la lista de pendientes."
        : activeVisit.isLocal
        ? "Guardado en el teléfono. Se enviará solo al recuperar señal; puedes seguir trabajando."
        : "No olvides marcar tu Check-Out";

    return (
        <Box mx={4} mt={4}>
            <Box
                bg={`${tone}.50`}
                borderLeft="4px solid"
                borderColor={`${tone}.400`}
                p={3}
                borderRadius="md"
            >
                <Flex justify="space-between" align="center">
                    <Box flex={1} minW={0}>
                        <Text fontSize="sm" color={`${tone}.800`} mb={1}>
                            {titulo}
                        </Text>
                        <Text fontSize="xs" color={`${tone}.700`}>
                            Desde {new Date(activeVisit.createdAt).toLocaleTimeString()} • {detalle}
                        </Text>
                    </Box>
                    {activeVisit.imageUrl && (
                        <Box
                            ml={3}
                            w="60px"
                            h="60px"
                            borderRadius="md"
                            overflow="hidden"
                            border="2px solid"
                            borderColor="orange.300"
                            flexShrink={0}
                        >
                            <img
                                src={activeVisit.imageUrl}
                                alt="Check-In"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        </Box>
                    )}
                </Flex>
            </Box>
        </Box>
    );
}