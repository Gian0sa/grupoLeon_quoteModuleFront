// Filtros.jsx
import { Box, Flex, Text, Button, Input } from "@chakra-ui/react";

export default function Filtros({ estados, estadoActivo, setEstado, setStartDate, setEndDate, startDate, endDate }) {
  return (
    <>
      <Flex wrap="wrap" gap={2} mb={4}>
        {estados.map((estado) => (
          <Button
            key={estado}
            size="sm"
            variant={estadoActivo === estado ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => setEstado(estadoActivo === estado ? null : estado)}
          >
            {estado}
          </Button>
        ))}
      </Flex>
      <Flex gap={4} mb={4} wrap="wrap">
        <Box>
          <Text fontSize="sm">Desde</Text>
          <Input type="date" size="sm" value={startDate || ""} onChange={(e) => setStartDate(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="sm">Hasta</Text>
          <Input type="date" size="sm" value={endDate || ""} onChange={(e) => setEndDate(e.target.value)} />
        </Box>
      </Flex>
    </>
  );
}
