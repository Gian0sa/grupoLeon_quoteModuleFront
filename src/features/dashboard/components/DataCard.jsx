// DataCard.jsx
import { Box, Spinner, Text, useColorModeValue } from "@chakra-ui/react";

export function DataCard({ isLoading, error, data, render }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");

  return (
    <Box
      bg={cardBg}
      border="1px solid"
      borderRadius="xl"
      h="230px"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      color={textColor}
      p={2}
    >
      {isLoading ? (
        <Spinner color="teal.400" />
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
