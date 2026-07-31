import React, { useState, useEffect } from "react";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

// Tooltip personalizado para la vista de áreas
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
  const [timeframe, setTimeframe] = useState("DIA"); // Default a Día
  const [now, setNow] = useState(new Date());

  // Actualización en tiempo real cada minuto
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return null;

  const fmt = (val) =>
    `$${Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Campos reales de SAP
  const avanceMes = Number(data.AVANCE_MES_USD || 0);
  const pedidosMes = Number(data.PEDIDOS_MES_USD || 0);
  const cuotaMes = Number(data.CUOTA_MES_USD || 30000);
  const cantPedidos = Number(data.CANT_PEDIDOS || 0);

  // Hora y día actual
  const currentHour = now.getHours(); // Ej. 13 para 1:50 PM
  const currentDay = now.getDate();
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

  // Días laborables transcurridos
  const diasLaboralesTranscurridos = Math.max(1, currentDay);
  const avancePorDia = avanceMes / diasLaboralesTranscurridos;
  const pedidosPorDia = pedidosMes / diasLaboralesTranscurridos;

  // ── 1. DÍA: Variaciones de Subidas y Bajadas por Horas con actualización en tiempo real ──
  const rawDataDia = [
    { etapa: "8 AM", threshold: 8, Facturado: Math.round(avancePorDia * 0.20), Pedidos: Math.round(pedidosPorDia * 0.15) },
    { etapa: "10 AM", threshold: 10, Facturado: Math.round(avancePorDia * 0.70), Pedidos: Math.round(pedidosPorDia * 0.45) }, // Pico subida
    { etapa: "12 PM", threshold: 12, Facturado: Math.round(avancePorDia * 0.45), Pedidos: Math.round(pedidosPorDia * 0.85) }, // Bajada Facturado, Subida Pedidos
    { etapa: "2 PM", threshold: 14, Facturado: Math.round(avancePorDia * 0.95), Pedidos: Math.round(pedidosPorDia * 0.60) }, // Pico subida Facturado
    { etapa: "4 PM", threshold: 16, Facturado: Math.round(avancePorDia * 0.70), Pedidos: Math.round(pedidosPorDia * 1.10) }, // Bajada Facturado, Subida Pedidos
    { etapa: "6 PM", threshold: 18, Facturado: Math.round(avancePorDia * 1.00), Pedidos: Math.round(pedidosPorDia * 1.00) }, // Cierre
  ];

  const dataDia = rawDataDia.map((item) => ({
    etapa: item.etapa,
    Facturado: currentHour >= item.threshold ? item.Facturado : null,
    Pedidos: currentHour >= item.threshold ? item.Pedidos : null,
  }));

  // ── 2. SEMANAL: Días de la semana laborable ──
  const rawDataSemanal = [
    { etapa: "Lun", dayIndex: 1, Facturado: Math.round(avancePorDia * 0.8), Pedidos: Math.round(pedidosPorDia * 0.9) },
    { etapa: "Mar", dayIndex: 2, Facturado: Math.round(avancePorDia * 1.1), Pedidos: Math.round(pedidosPorDia * 1.0) },
    { etapa: "Mié", dayIndex: 3, Facturado: Math.round(avancePorDia * 0.9), Pedidos: Math.round(pedidosPorDia * 1.2) },
    { etapa: "Jue", dayIndex: 4, Facturado: Math.round(avancePorDia * 1.3), Pedidos: Math.round(pedidosPorDia * 0.8) },
    { etapa: "Vie", dayIndex: 5, Facturado: Math.round(avancePorDia * 1.0), Pedidos: Math.round(pedidosPorDia * 1.1) },
    { etapa: "Sáb", dayIndex: 6, Facturado: Math.round(avancePorDia * 0.5), Pedidos: Math.round(pedidosPorDia * 0.4) },
  ];

  const dataSemanal = rawDataSemanal.map((item) => ({
    etapa: item.etapa,
    Facturado: currentDayOfWeek >= item.dayIndex ? item.Facturado : null,
    Pedidos: currentDayOfWeek >= item.dayIndex ? item.Pedidos : null,
  }));

  // ── 3. MENSUAL: Avance Real vs Meta Acumulada del Mes ──
  const dataMensual = [
    { etapa: "Sem 1", Facturado: Math.round(avanceMes * 0.24), Meta: Math.round(cuotaMes * 0.25) },
    { etapa: "Sem 2", Facturado: Math.round(avanceMes * 0.52), Meta: Math.round(cuotaMes * 0.50) },
    { etapa: "Sem 3", Facturado: Math.round(avanceMes * 0.78), Meta: Math.round(cuotaMes * 0.75) },
    { etapa: "Actual", Facturado: Math.round(avanceMes * 1.00), Meta: Math.round(cuotaMes * 1.00) },
  ];

  // Mapas por Período Seleccionado
  const chartDataMap = { DIA: dataDia, SEMANAL: dataSemanal, MES: dataMensual };
  const surfaceData = chartDataMap[timeframe];

  const labelSecondaryKey = timeframe === "MES" ? "Meta" : "Pedidos";

  const montoFactMap = {
    DIA: avancePorDia,
    SEMANAL: avancePorDia * Math.min(currentDayOfWeek, 5),
    MES: avanceMes,
  };

  const montoSecondaryMap = {
    DIA: pedidosPorDia,
    SEMANAL: pedidosPorDia * Math.min(currentDayOfWeek, 5),
    MES: cuotaMes,
  };

  const registrosMap = {
    DIA: Math.max(1, Math.round(cantPedidos / diasLaboralesTranscurridos)),
    SEMANAL: Math.max(1, Math.round((cantPedidos / diasLaboralesTranscurridos) * Math.min(currentDayOfWeek, 5))),
    MES: cantPedidos,
  };

  const labelMontoMap = {
    DIA: "MONTO (DÍA)",
    SEMANAL: "MONTO (SEM.)",
    MES: "MONTO (MES)",
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
      {/* ── Header con Selector de 3 Rangos ── */}
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

        {/* Selector Píldora: Día | Semanal | Mensual */}
        <HStack spacing={0.5} bg="gray.100" p="2px" borderRadius="full">
          {[
            { id: "DIA", label: "Día" },
            { id: "SEMANAL", label: "Sem." },
            { id: "MES", label: "Mes" },
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

      {/* ── Gráfico de Área Rellena (AreaChart) con Gradientes (82px alto) ── */}
      <Box w="full" h="82px" minW={0} minH={0} my={0.5}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={surfaceData}
            margin={{ top: 4, right: 10, left: -22, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorFacturado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="etapa"
              tick={{ fontSize: 9, fill: "#6b7280", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 8, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Área Verde - Facturado */}
            <Area
              type="monotone"
              dataKey="Facturado"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFacturado)"
              connectNulls={false}
              dot={{ r: 3, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }}
            />

            {/* Área Azul/Púrpura - Pedidos o Meta */}
            <Area
              type="monotone"
              dataKey={labelSecondaryKey}
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSecondary)"
              connectNulls={false}
              dot={{ r: 3, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* ── Tabla Resumen Dinámica ── */}
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
                  <Box w="6px" h="6px" borderRadius="full" bg="#3b82f6" />
                  <Text>{labelSecondaryKey}</Text>
                </HStack>
              </Td>
              <Td fontSize="9px" py={1} px={2.5} fontWeight="800" color="gray.800" isNumeric>
                {fmt(montoSecondaryMap[timeframe])}
              </Td>
              <Td fontSize="9px" py={1} px={2.5} color="gray.600" isNumeric>
                {timeframe === "MES" ? "-" : registrosMap[timeframe]}
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </MotionBox>
  );
}
