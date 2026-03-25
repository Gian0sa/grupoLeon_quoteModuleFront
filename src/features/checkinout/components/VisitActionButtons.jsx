import { VStack, Button, Divider, Flex, Spinner, Icon, Text } from "@chakra-ui/react";
import { FiMapPin } from "react-icons/fi";

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
    return (
        <>
            <Flex align="center" justify="center" py={2} color="gray.500" fontSize="sm">
                <Icon as={FiMapPin} mr={2} />
                <Text>Se registrará tu ubicación actual</Text>
            </Flex>

            <Divider my={2} />

            <VStack spacing={3} pt={2}>
                {!hasActiveCheckIn && (
                    <Button
                        colorScheme="green"
                        width="100%"
                        size="lg"
                        height="56px"
                        fontSize="md"
                        fontWeight="600"
                        onClick={onCheckIn}
                        isLoading={isCreatingVisit || isSubmitting}
                        isDisabled={isSubmitting || isPending}
                        loadingText="Registrando..."
                        boxShadow="md"
                        _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                        transition="all 0.2s"
                    >
                        Check In
                    </Button>
                )}

                {hasActiveCheckIn && (
                    <Button
                        colorScheme="green"
                        variant="outline"
                        width="100%"
                        size="lg"
                        height="56px"
                        fontSize="md"
                        fontWeight="600"
                        onClick={onNavigateHistory}
                    >
                        Volver al historial del cliente
                    </Button>
                )}

                {hasActiveCheckIn && (
                    <Button
                        colorScheme="red"
                        width="100%"
                        size="lg"
                        height="56px"
                        fontSize="md"
                        fontWeight="600"
                        onClick={onCheckOut}
                        isLoading={isCreatingVisit || isSubmitting}
                        isDisabled={isSubmitting || isPending}
                        loadingText="Registrando..."
                        boxShadow="md"
                        _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                        transition="all 0.2s"
                    >
                        Check Out
                    </Button>
                )}
            </VStack>

            {isCreatingVisit && (
                <Flex justify="center" pt={4}>
                    <Spinner size="lg" color="green.500" thickness="3px" />
                </Flex>
            )}
        </>
    );
}