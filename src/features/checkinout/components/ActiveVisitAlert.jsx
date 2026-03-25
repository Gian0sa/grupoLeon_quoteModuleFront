import { Box, Flex, Text } from "@chakra-ui/react";

export function ActiveVisitAlert({ activeVisit }) {
    if (!activeVisit) return null;

    return (
        <Box mx={4} mt={4}>
            <Box
                bg="orange.50"
                borderLeft="4px solid"
                borderColor="orange.400"
                p={3}
                borderRadius="md"
            >
                <Flex justify="space-between" align="center">
                    <Box flex={1}>
                        <Text fontSize="sm" color="orange.800" mb={1}>
                            Tienes un <strong>Check-In activo</strong> en{" "}
                            <strong>{activeVisit.storeName}</strong>
                        </Text>
                        <Text fontSize="xs" color="orange.700">
                            Desde {new Date(activeVisit.createdAt).toLocaleTimeString()} • No
                            olvides marcar tu Check-Out
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