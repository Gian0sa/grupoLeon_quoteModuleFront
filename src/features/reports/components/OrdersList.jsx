// OrdenesLista.jsx
import { Box, Text, Button } from "@chakra-ui/react";

export default function OrdenesLista({ detalle, onVerSeguimiento }) {
  return detalle.map((orden, idx) => (
    <Box key={idx} p={4} border="1px solid #ccc" borderRadius="lg" mb={4}>
      <Text>{orden.cliente.nombre}</Text>
      <Text><b>Orden:</b> #{orden.orden.numero}</Text>
      <Text><b>Fecha:</b> {orden.orden.fechaCreacion}</Text>
      <Text>{orden.estadoOrden}</Text>
      <Button mt={2} size="sm" colorScheme="blue" onClick={() => onVerSeguimiento(orden)}>
        Ver seguimiento
      </Button>
    </Box>
  ));
}
