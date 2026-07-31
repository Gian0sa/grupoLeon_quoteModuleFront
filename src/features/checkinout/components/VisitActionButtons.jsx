import { VStack, Button, Flex, Spinner, Icon, Text, Box, HStack, useColorModeValue } from "@chakra-ui/react";
import { FiMapPin, FiLogIn, FiLogOut, FiClock } from "react-icons/fi";

export function VisitActionButtons({
    hasActiveCheckIn,
    isCreatingVisit,
    isSubmitting,
    isPending,
    selectedClient,
    activeVisit,
    onCheckIn,
    onCheckOut,
    onNavigateHistory,
}) {
    const cardBg = useColorModeValue("white", "gray.800");

    return (
        <Box w="full" pt={2}>
            {/* Indicador de GPS en tiempo real */}
            <Flex
                align="center"
                justify="center"
                py={2.5}
                px={4}
                mb={4}
                bg="whiteAlpha.800"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="0 2px 8px rgba(0,0,0,0.03)"
            >
                <HStack spacing={2}>
                    <Box w="8px" h="8px" borderRadius="full" bg="green.500" boxShadow="0 0 8px rgba(34, 197, 94, 0.8)" />
                    <Icon as={FiMapPin} color="green.600" boxSize={4} />
                    <Text fontSize="xs" fontWeight="700" color="gray.700">
                        Ubicación GPS actual sincronizada automáticamente
                    </Text>
                </HStack>
            </Flex>

            <VStack spacing={3}>
                {!hasActiveCheckIn && (
                    <Button
                        bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                        color="white"
                        width="100%"
                        size="lg"
                        height="56px"
                        borderRadius="2xl"
                        fontSize="md"
                        fontWeight="800"
                        letterSpacing="wide"
                        onClick={onCheckIn}
                        isLoading={isCreatingVisit || isSubmitting}
                        isDisabled={isSubmitting || isPending}
                        loadingText="Registrando Check-In..."
                        boxShadow="0 8px 25px rgba(22, 101, 52, 0.35)"
                        _hover={{
                            bg: "#0d4226",
                            transform: "translateY(-2px)",
                            boxShadow: "0 12px 30px rgba(22, 101, 52, 0.45)",
                        }}
                        _active={{ transform: "translateY(0)" }}
                        transition="all 0.2s"
                        leftIcon={<Icon as={FiLogIn} boxSize={5} />}
                    >
                        Registrar Check In
                    </Button>
                )}

                {hasActiveCheckIn && (
                    <Button
                        variant="outline"
                        colorScheme="green"
                        borderColor="green.600"
                        color="green.700"
                        width="100%"
                        size="lg"
                        height="50px"
                        borderRadius="xl"
                        fontSize="sm"
                        fontWeight="700"
                        onClick={onNavigateHistory}
                        leftIcon={<Icon as={FiClock} boxSize={4} />}
                        _hover={{ bg: "green.50" }}
                    >
                        Volver al Historial del Cliente
                    </Button>
                )}

                {hasActiveCheckIn && (
                    <Button
                        bg="linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)"
                        color="white"
                        width="100%"
                        size="lg"
                        height="56px"
                        borderRadius="2xl"
                        fontSize="md"
                        fontWeight="800"
                        letterSpacing="wide"
                        onClick={onCheckOut}
                        isLoading={isCreatingVisit || isSubmitting}
                        isDisabled={isSubmitting || isPending}
                        loadingText="Registrando Check-Out..."
                        boxShadow="0 8px 25px rgba(220, 38, 38, 0.35)"
                        _hover={{
                            bg: "#991b1b",
                            transform: "translateY(-2px)",
                            boxShadow: "0 12px 30px rgba(220, 38, 38, 0.45)",
                        }}
                        _active={{ transform: "translateY(0)" }}
                        transition="all 0.2s"
                        leftIcon={<Icon as={FiLogOut} boxSize={5} />}
                    >
                        Registrar Check Out
                    </Button>
                )}
            </VStack>

            {isCreatingVisit && (
                <Flex justify="center" pt={4}>
                    <Spinner size="lg" color="green.600" thickness="3px" />
                </Flex>
            )}
        </Box>
    );
}