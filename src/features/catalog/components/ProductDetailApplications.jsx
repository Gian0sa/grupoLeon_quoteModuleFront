import { Box, SimpleGrid, Text, Spinner, Badge } from '@chakra-ui/react';

export default function ProductDetailApplications({ appsRes, appsLoading }) {
  return (
    <Box bg="white" borderRadius="xl" shadow="md" borderWidth="1px" overflow="hidden">
      <Box bg="green.700" px={4} py={2}>
        <Text color="white" fontWeight="bold" fontSize="sm">APLICACIONES</Text>
      </Box>
      <Box p={4}>
        {appsLoading ? (
          <Spinner size="sm" />
        ) : appsRes?.data?.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
            {appsRes.data.map((app, i) => (
              <Box key={i} p={3} bg="gray.50" borderRadius="md" borderWidth="1px" fontSize="xs">
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text fontWeight="bold">
                    {app.vehiculo?.marca?.nombre} {app.vehiculo?.modelo?.nombre}
                  </Text>
                  <Text color="gray.600">
                    {app.vehiculo?.tipoVehiculo?.nombre || ''}
                  </Text>
                  {app.vehiculo?.caracteristicasVehiculos?.map((c, j) => (
                    <Text key={j} color="gray.500">{c.label?.nombre}: {c.valor}</Text>
                  ))}
                </Box>
                {app.documentoOrigen && (
                  <Badge mt={1} size="sm" colorScheme="purple" whiteSpace="normal" noOfLines={2}>{app.documentoOrigen.nombre}</Badge>
                )}
              </Box>
            ))}
          </SimpleGrid>
        ) : (
          <Text color="gray.400" fontSize="sm">Sin aplicaciones registradas.</Text>
        )}
      </Box>
    </Box>
  );
}
