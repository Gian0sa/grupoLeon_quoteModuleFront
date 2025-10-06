import { Box, VStack, Text } from '@chakra-ui/react';

export default function ProductApplications({ product }) {
  if (!product.applications?.length) return null;

  return (
    <Box bg="white" borderTopWidth="1px" px={4} py={2}>
      <Box bg="red.600" color="white" px={4} py={1} mx={-4} mb={2}>
        <Text fontWeight="bold" fontSize="sm">APLICACION</Text>
      </Box>
      <VStack align="stretch" spacing={1}>
        {product.applications.slice(0, 3).map((app, index) => (
          <Text key={index} fontSize="xs" color="gray.700">
            • {app.vehicleBrand} {app.vehicleModel} ({app.yearFrom}-{app.yearTo})
          </Text>
        ))}
        {product.applications.length > 3 && (
          <Text fontSize="xs" color="gray.500" fontStyle="italic">
            +{product.applications.length - 3} más...
          </Text>
        )}
      </VStack>
    </Box>
  );
}
