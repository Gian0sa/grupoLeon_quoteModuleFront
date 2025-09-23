// DataCard.jsx
import { Box, Spinner, Text } from "@chakra-ui/react";

export function DataCard({ isLoading, error, data, render }) {
  return (
    <Box
      bg="card"
      border="1px solid"
      borderColor="gray.200"
      _dark={{ borderColor: "gray.700" }}
      borderRadius="xl"
      h="240px"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      color="text"
      p={2}
    >
      {isLoading ? (
        <Spinner color="accent" />
      ) : error ? (
        <Text color="red.400">Error al cargar</Text>
      ) : data ? (
        render(data)
      ) : (
        <Text>No hay datos disponibles</Text>
      )}
    </Box>
  );
}
