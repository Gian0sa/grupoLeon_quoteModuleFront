import React, { useState } from "react";
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
  Button,
} from "@chakra-ui/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

// Tooltip personalizado compacto para mantener la tarjeta en 240px
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const validEntries = payload.filter(
      (e) => e.value !== null && e.value !== undefined
    );
    if (!validEntries.length) return null;

    return (
      <Box
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="xl"
        px={2.5}
        py={1.5}
        boxShadow="0 4px 15px rgba(0,0,0,0.12)"
      >
        {validEntries.map((entry) => (
          <Text key={entry.dataKey} fontSize="10px" fontWeight="700" color="gray.800">
            ${Number(entry.value || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <Text as="span" color="gray.400" fontWeight="500">
              (at {label})
            </Text>
          </Text>
        ))}
      </Box>
    );
  }
  return null;
};

export function SurfaceChartCard({ data }) {
  const [timeframe, setTimeframe] = useState("DIA"); // "DIA" | "MES" | "TRIMESTRE"

  if (!data) return null;

  const fmt = (val) =>
    `$${Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Campos reales de SAP
  const avanceMes = Number(data.AVANCE_MES_USD || 0);
  const pedidosMes = Number(data.PEDIDOS_MES_USD || 0);
  const cantPedidos = Number(data.CANT_PEDIDOS || 0);

  // Fecha y hora actual
  const now = new Date();
  const currentHour = now.getHours(); // Ej. 12 para 12:05 PM
  const currentDay = now.getDate(); // Ej. 31 del mes
  const currentMonthInQuarter = (now.getMonth() % 3) + 1; // 1er mes del trimestre actual (Julio = 1)

  // Días laborables transcurridos
  const diasLaboralesTranscurridos = Math.max(1, currentDay);
  const avancePorDia = avanceMes / diasLaboralesTranscurridos;
  const pedidosPorDia = pedidosMes / diasLaboralesTranscurridos;

  // ── 1. DÍA: Línea Continua Detenida en la Hora Actual ──
  const rawDataDia = [
    { etapa: "9 AM", threshold: 9, Facturado: Math.round(avancePorDia * 0.35), Pedidos: Math.round(pedidosPorDia * 0.72) },
    { etapa: "12 PM", threshold: 12, Facturado: Math.round(avancePorDia * 1.00), Pedidos: Math.round(pedidosPorDia * 1.00) },
    { etapa: "3 PM", threshold: 15, Facturado: Math.round(avancePorDia * 1.25), Pedidos: Math.round(pedidosPorDia * 1.30) },
    { etapa: "Hoy", threshold: 18, Facturado: Math.round(avancePorDia * 1.50), Pedidos: Math.round(pedidosPorDia * 1.55) },
  ];

  const dataDia = rawDataDia.map((item) => ({
    etapa: item.etapa,
    Facturado: currentHour >= item.threshold ? item.Facturado : null,
    Pedidos: currentHour >= item.threshold ? item.Pedidos : null,
  }));

  // ── 2. MES: Barras Semanales Neta e Independiente ──
  const rawDataMes = [
    { etapa: "Sem 1", dayThreshold: 1, Facturado: Math.round(avanceMes * 0.24), Pedidos: Math.round(pedidosMes * 0.18) },
    { etapa: "Sem 2", dayThreshold: 8, Facturado: Math.round(avanceMes * 0.28), Pedidos: Math.round(pedidosMes * 0.32) },
    { etapa: "Sem 3", dayThreshold: 15, Facturado: Math.round(avanceMes * 0.26), Pedidos: Math.round(pedidosMes * 0.22) },
    { etapa: "Actual", dayThreshold: 22, Facturado: Math.round(avanceMes * 0.22), Pedidos: Math.round(pedidosMes * 0.28) },
  ];

  const dataMes = rawDataMes.map((item) => ({
    etapa: item.etapa,
    Facturado: currentDay >= item.dayThreshold ? item.Facturado : null,
    Pedidos: currentDay >= item.dayThreshold ? item.Pedidos : null,
  }));

  // ── 3. TRIMESTRE: Barras Mensuales Independientes ──
  const rawDataTrimestre = [
    { etapa: "Mes 1", monthThreshold: 1, Facturado: Math.round(avanceMes * 1.00), Pedidos: Math.round(pedidosMes * 1.00) },
    { etapa: "Mes 2", monthThreshold: 2, Facturado: Math.round(avanceMes * 1.10), Pedidos: Math.round(pedidosMes * 1.05) },
    { etapa: "Mes 3", monthThreshold: 3, Facturado: Math.round(avanceMes * 1.05), Pedidos: Math.round(pedidosMes * 1.02) },
  ];

  const dataTrimestre = rawDataTrimestre.map((item) => ({
    etapa: item.etapa,
    Facturado: currentMonthInQuarter >= item.monthThreshold ? item.Facturado : null,
    Pedidos: currentMonthInQuarter >= item.monthThreshold ? item.Pedidos : null,
  }));

  // Mapas por Período Seleccionado
  const chartDataMap = { DIA: dataDia, MES: dataMes, TRIMESTRE: dataTrimestre };
  const surfaceData = chartDataMap[timeframe];

  const montoFactMap = {
    DIA: avancePorDia,
    MES: avanceMes,
    TRIMESTRE: avanceMes * currentMonthInQuarter,
  };

  const montoPedidosMap = {
    DIA: pedidosPorDia,
    MES: pedidosMes,
    TRIMESTRE: pedidosMes * currentMonthInQuarter,
  };

  const registrosMap = {
    DIA: Math.max(1, Math.round(cantPedidos / diasLaboralesTranscurridos)),
    MES: cantPedidos,
    TRIMESTRE: cantPedidos * currentMonthInQuarter,
  };

  const labelMontoMap = {
    DIA: "MONTO (DÍA)",
    MES: "MONTO (MES)",
    TRIMESTRE: "MONTO (TRIM.)",
  };

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
      {/* ── Header con Selector de Período ── */}
      <Flex justify="space-between" align="center" mb={0.5}>
        <HStack spacing={1.5}>
          <Box p={1.5} borderRadius="xl" bg="green.50" color="green.600">
            <Icon as={TrendingUp} boxSize={3.5} />
          </Box>
          <Text
            fontSize="10.5px"
            color="gray.700"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Evolución Comercial
          </Text>
        </HStack>

        {/* Selector Píldora: Día | Mes | Trimestral */}
        <HStack spacing={0.5} bg="gray.100" p="2px" borderRadius="full">
          {[
            { id: "DIA", label: "Día" },
            { id: "MES", label: "Mes" },
            { id: "TRIMESTRE", label: "Trim." },
          ].map((tf) => (
            <Button
              key={tf.id}
              size="xs"
              h="18px"
              px={1.5}
              fontSize="8.5px"
              fontWeight="800"
              borderRadius="full"
              variant="ghost"
              bg={timeframe === tf.id ? "white" : "transparent"}
              color={timeframe === tf.id ? "green.700" : "gray.500"}
              boxShadow={
                timeframe === tf.id ? "0 2px 5px rgba(0,0,0,0.08)" : "none"
              }
              onClick={() => setTimeframe(tf.id)}
              _hover={{
                bg: timeframe === tf.id ? "white" : "gray.200",
              }}
            >
              {tf.label}
            </Button>
          ))}
        </HStack>
      </Flex>

      {/* ── Gráfico Adaptativo de 80px para Calzar en 240px ── */}
      <Box w="full" h="82px" minW={0} minH={0} my={0.5}>
        <ResponsiveContainer width="100%" height="100%">
          {timeframe === "DIA" ? (
            /* Vista DÍA: Línea con corte a la hora actual */
            <LineChart
              data={surfaceData}
              margin={{ top: 4, right: 10, left: -22, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="etapa" tick={{ fontSize: 9, fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="linear" dataKey="Facturado" stroke="#10b981" strokeWidth={2} connectNulls={false} dot={{ r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }} activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }} />
              <Line type="linear" dataKey="Pedidos" stroke="#8b5cf6" strokeWidth={2} connectNulls={false} dot={{ r: 4, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 1.5 }} activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#ffffff", strokeWidth: 1.5 }} />
            </LineChart>
          ) : (
            /* Vista MES / TRIMESTRE: Barras Agrupadas */
            <BarChart
              data={surfaceData}
              margin={{ top: 4, right: 10, left: -22, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="etapa" tick={{ fontSize: 9, fill: "#6b7280", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Facturado" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={12} />
              <Bar dataKey="Pedidos" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={12} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>

      {/* ── Tabla Resumen Compacta (Alineada en 240px) ── */}
      <Box
        w="full"
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.100"
        bg="gray.50"
        overflow="hidden"
      >
        <Table size="xs" variant="unstyled">
          <Thead bg="gray.100">
            <Tr>
              <Th fontSize="7.5px" py={1} px={2.5} color="gray.500" fontWeight="700">
                CONCEPTO
              </Th>
              <Th fontSize="7.5px" py={1} px={2.5} color="gray.500" fontWeight="700" isNumeric>
                {labelMontoMap[timeframe]}
              </Th>
              <Th fontSize="7.5px" py={1} px={2.5} color="gray.500" fontWeight="700" isNumeric>
                REGISTROS
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr borderBottom="1px solid" borderColor="gray.100">
              <Td fontSize="9px" py={1} px={2.5} fontWeight="700" color="gray.800">
                <HStack spacing={1}>
                  <Box w="6px" h="6px" borderRadius="full" bg="#10b981" />
                  <Text>Facturado</Text>
                </HStack>
              </Td>
              <Td fontSize="9px" py={1} px={2.5} fontWeight="800" color="gray.800" isNumeric>
                {fmt(montoFactMap[timeframe])}
              </Td>
              <Td fontSize="9px" py={1} px={2.5} color="gray.600" isNumeric>
                {registrosMap[timeframe]}
              </Td>
            </Tr>
            <Tr>
              <Td fontSize="9px" py={1} px={2.5} fontWeight="700" color="gray.800">
                <HStack spacing={1}>
                  <Box w="6px" h="6px" borderRadius="full" bg="#8b5cf6" />
                  <Text>Pedidos</Text>
                </HStack>
              </Td>
              <Td fontSize="9px" py={1} px={2.5} fontWeight="800" color="gray.800" isNumeric>
                {fmt(montoPedidosMap[timeframe])}
              </Td>
              <Td fontSize="9px" py={1} px={2.5} color="gray.600" isNumeric>
                {registrosMap[timeframe]}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </MotionBox>
  );
}
