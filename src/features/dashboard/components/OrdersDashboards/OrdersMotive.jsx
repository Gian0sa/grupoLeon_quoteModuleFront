import { Box, VStack, HStack, Text, Spinner, Center, Badge } from "@chakra-ui/react";

export default function OrdersMotive({ ordersMotive, isLoading, isError }) {
  if (isLoading) {
    return (
      <Center py={6}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center py={6} color="red.500">
        Error al cargar los motivos
      </Center>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white" shadow="sm" mb={6}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Motivos de Cancelación
      </Text>
      
      {ordersMotive && ordersMotive.length > 0 ? (
        <VStack spacing={3} align="stretch">
          {ordersMotive.map((item, index) => (
            <Box 
              key={index} 
              p={3} 
              bg="gray.50" 
              borderRadius="md"
              borderLeftWidth="4px"
              borderLeftColor="red.400"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="bold" flex="1">
                  {item.cancellationReason}
                </Text>
                <Badge colorScheme="red" fontSize="sm">
                  {item.ordersCount} órdenes
                </Badge>
              </HStack>
              
              <HStack spacing={3} fontSize="xs" color="gray.600" flexWrap="wrap">
                <Text>👥 Clientes: {item.affectedClients}</Text>
                <Text>📦 Unidades: {item.cancelledUnits?.toLocaleString() || 0}</Text>
                <Text>🏷️ Productos: {item.differentProducts}</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      ) : (
        <Center py={4} color="gray.500">
          No hay datos disponibles
        </Center>
      )}
    </Box>
  );
}