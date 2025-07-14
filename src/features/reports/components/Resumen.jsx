// Resumen.jsx
import { Stack, Text, Divider } from "@chakra-ui/react";

export default function Resumen({ resumen }) {
  return (
    <Stack spacing={2} mb={6}>
      <Text><b>Total órdenes:</b> {resumen.totalOrdenes}</Text>
      <Divider />
      <Text><b>Resumen por estado:</b></Text>
      {Object.entries(resumen.porEstado).map(([estado, count]) => (
        <Text key={estado}>• {estado}: {count}</Text>
      ))}
    </Stack>
  );
}
