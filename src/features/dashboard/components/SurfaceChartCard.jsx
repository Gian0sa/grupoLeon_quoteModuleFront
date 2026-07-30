import {
  Box,
  Text,
  HStack,
  Icon,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from "@chakra-ui/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function SurfaceChartCard({ data }) {
  if (!data) return null;

  const formatCurrency = (val) =>
    `$${Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const avance = Number(data.AVANCE_MES_USD || 0);
  const pedidos = Number(data.PEDIDOS_MES_USD || 0);

  // Dataset mensual por semanas (Evolución del Mes)
  const surfaceData = [
    { etapa: "Sem 1", Facturado: Math.round(avance * 0.22), Pedidos: Math.round(pedidos * 0.35) },
    { etapa: "Sem 2", Facturado: Math.round(avance * 0.52), Pedidos: Math.round(pedidos * 0.68) },
    { etapa: "Sem 3", Facturado: Math.round(avance * 0.78), Pedidos: Math.round(pedidos * 0.88) },
    { etapa: "Actual", Facturado: avance, Pedidos: pedidos },
  ];

  return (
    <MotionBox
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      bg="white"
      borderRadius="3xl"
      p={5}
      w="full"
      h="240px"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      boxShadow="0 12px 35px rgba(0,0,0,0.05)"
      border="1px solid"
      borderColor="gray.100"
      position="relative"
      overflow="hidden"
    >
      {/* Header con título y badge mensual */}
      <Flex justify="space-between" align="center" mb={1}>
        <HStack spacing={2}>
          <Box p={1.5} borderRadius="xl" bg="emerald.50" color="emerald.600">
            <Icon as={TrendingUp} boxSize={4} />
          </Box>
          <Text fontSize="xs" color="gray.700" fontWeight="800" textTransform="uppercase" letterSpacing="wider">
            Evolución Mensual
          </Text>
        </HStack>

        <HStack spacing={2}>
          <HStack spacing={1}>
            <Box w="8px" h="8px" borderRadius="full" bg="#10b981" />
            <Text fontSize="10px" fontWeight="700" color="gray.600">Facturado</Text>
          </HStack>
          <HStack spacing={1}>
            <Box w="8px" h="8px" borderRadius="full" bg="#8b5cf6" />
            <Text fontSize="10px" fontWeight="700" color="gray.600">Pedidos</Text>
          </HStack>
        </HStack>
      </Flex>

      {/* Gráfico de Líneas con Puntos (Dots) y Colores Contrastados */}
      <Box w="full" h="95px" minW={0} minH={0} my={1}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={surfaceData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
            <XAxis dataKey="etapa" tick={{ fontSize: 9.5, fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8.5, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(val, name) => [formatCurrency(val), name]}
              contentStyle={{ background: "#1f2937", color: "#fff", borderRadius: "12px", border: "none", fontSize: "11px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}
            />
            
            {/* Línea Facturado (Verde Esmeralda #10b981 con Puntos) */}
            <Line
              type="monotone"
              dataKey="Facturado"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
            />

            {/* Línea Pedidos (Púrpura #8b5cf6 con Puntos) */}
            <Line
              type="monotone"
              dataKey="Pedidos"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Mini Tabla Dinámica tipo Excel */}
      <Box overflow="hidden" w="full" borderRadius="xl" border="1px solid" borderColor="gray.100" bg="gray.50">
        <Table size="xs" variant="unstyled">
          <Thead bg="gray.100">
            <Tr>
              <Th fontSize="8.5px" py={1} px={2.5} color="gray.600">CONCEPTO</Th>
              <Th fontSize="8.5px" py={1} px={2.5} color="gray.600" isNumeric>MONTO</Th>
              <Th fontSize="8.5px" py={1} px={2.5} color="gray.600" isNumeric>REGISTROS</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr borderBottom="1px solid rgba(0,0,0,0.03)">
              <Td fontSize="9.5px" py={1} px={2.5} fontWeight="700" color="emerald.700">
                <HStack spacing={1.5}>
                  <Box w="6px" h="6px" borderRadius="full" bg="#10b981" />
                  <Text>Facturado</Text>
                </HStack>
              </Td>
              <Td fontSize="9.5px" py={1} px={2.5} fontWeight="800" color="gray.800" isNumeric>{formatCurrency(avance)}</Td>
              <Td fontSize="9.5px" py={1} px={2.5} color="gray.600" isNumeric>{data.CANT_PEDIDOS || 0}</Td>
            </Tr>
            <Tr>
              <Td fontSize="9.5px" py={1} px={2.5} fontWeight="700" color="purple.700">
                <HStack spacing={1.5}>
                  <Box w="6px" h="6px" borderRadius="full" bg="#8b5cf6" />
                  <Text>Pedidos</Text>
                </HStack>
              </Td>
              <Td fontSize="9.5px" py={1} px={2.5} fontWeight="800" color="gray.800" isNumeric>{formatCurrency(pedidos)}</Td>
              <Td fontSize="9.5px" py={1} px={2.5} color="gray.600" isNumeric>{data.CANT_PEDIDOS || 0}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </MotionBox>
  );
}
