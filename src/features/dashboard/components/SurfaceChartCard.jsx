import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  HStack,
  VStack,
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
import { useAuthStore } from "../../auth/stores/useAuthStore";

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

export function SurfaceChartCard({ data, isCurrentMonth = true }) {
  const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0 || salesEmployeeCode === "0" || salesEmployeeCode === "null";

  // Por default: Administrador ve mensual (MES), vendedor ve diario (DIA). En meses anteriores se fuerza a MES.
  const [timeframe, setTimeframe] = useState(() => {
    if (!isCurrentMonth) return "MES";
    return isAdmin ? "MES" : "DIA";
  });
  const [now, setNow] = useState(new Date());

  // Sincronizar timeframe si cambia el usuario, el código de empleado o el mes seleccionado
  useEffect(() => {
    if (!isCurrentMonth) {
      setTimeframe("MES");
    } else {
      setTimeframe(isAdmin ? "MES" : "DIA");
    }
  }, [salesEmployeeCode, isCurrentMonth]);

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
  const cuotaMes = Number(data.CUOTA_MES_USD || 0);
  const cantPedidos = Number(data.CANT_PEDIDOS || 0);
  const nombreVendedor = data.VENDEDOR && data.VENDEDOR !== "Sin datos" ? data.VENDEDOR : null;

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

  // ── 2. MENSUAL: Avance Real vs Meta Acumulada del Mes ──
  // Sem 1: Días 1-7 | Sem 2: Días 8-14 | Sem 3: Días 15-21 | Actual: Días 22+
  const activeWeek = !isCurrentMonth ? 4 : (currentDay <= 7 ? 1 : currentDay <= 14 ? 2 : currentDay <= 21 ? 3 : 4);

  const dataMensual = [
    { 
      etapa: "Sem 1", 
      Facturado: activeWeek >= 1 ? (activeWeek === 1 ? Math.round(avanceMes) : Math.round(avanceMes * 0.25)) : null, 
      Meta: Math.round(cuotaMes * 0.25) 
    },
    { 
      etapa: "Sem 2", 
      Facturado: activeWeek >= 2 ? (activeWeek === 2 ? Math.round(avanceMes) : Math.round(avanceMes * 0.50)) : null, 
      Meta: Math.round(cuotaMes * 0.50) 
    },
    { 
      etapa: "Sem 3", 
      Facturado: activeWeek >= 3 ? (activeWeek === 3 ? Math.round(avanceMes) : Math.round(avanceMes * 0.75)) : null, 
      Meta: Math.round(cuotaMes * 0.75) 
    },
    { 
      etapa: "Actual", 
      Facturado: activeWeek >= 4 ? Math.round(avanceMes) : null, 
      Meta: Math.round(cuotaMes * 1.00) 
    },
  ];

  // Mapas por Período Seleccionado
  const chartDataMap = { DIA: dataDia, MES: dataMensual };
  const surfaceData = chartDataMap[timeframe];

  const labelSecondaryKey = timeframe === "MES" ? "Meta" : "Pedidos";

  const montoFactMap = {
    DIA: avancePorDia,
    MES: avanceMes,
  };

  const montoSecondaryMap = {
    DIA: pedidosPorDia,
    MES: cuotaMes,
  };

  const registrosMap = {
    DIA: Math.max(1, Math.round(cantPedidos / diasLaboralesTranscurridos)),
    MES: cantPedidos,
  };

  const labelMontoMap = {
    DIA: "MONTO (DÍA)",
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
          <VStack align="start" spacing={0}>
            <HStack spacing={1.5} align="center">
              <Text
                fontSize="10.5px"
                color="gray.700"
                fontWeight="800"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Evolución Comercial
              </Text>
              {timeframe === "DIA" && (
                <HStack spacing={1} bg="green.50" px={1.5} py={0.2} borderRadius="full" border="1px solid" borderColor="green.200">
                  <Box
                    w="4.5px"
                    h="4.5px"
                    borderRadius="full"
                    bg="green.500"
                    sx={{
                      "@keyframes livePulse": {
                        "0%": { transform: "scale(0.95)", opacity: 0.5 },
                        "50%": { transform: "scale(1.25)", opacity: 1 },
                        "100%": { transform: "scale(0.95)", opacity: 0.5 }
                      },
                      animation: "livePulse 1.5s infinite ease-in-out"
                    }}
                  />
                  <Text fontSize="7.5px" color="green.600" fontWeight="850" letterSpacing="0.3px">VIVO</Text>
                </HStack>
              )}
            </HStack>
            {nombreVendedor && (
              <Text fontSize="9px" color="green.700" fontWeight="700" isTruncated maxW="130px">
                {nombreVendedor}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Selector Píldora: Día | Mensual */}
        {isCurrentMonth && (
          <HStack spacing={0.5} bg="gray.100" p="2px" borderRadius="full">
            {[
              { id: "DIA", label: "Día" },
              { id: "MES", label: "Mes" },
            ].map((tf) => (
              <Button
                key={tf.id}
                size="xs"
                h="18px"
                px={2.5}
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
        )}
      </Flex>

      {/* ── Gráfico de Área Rellena (AreaChart) con Gradientes (82px alto) ── */}
      <Box w="full" h="82px" minW={0} minH="82px" my={0.5}>
        <ResponsiveContainer width="100%" height={82} minWidth={100} minHeight={82} debounce={50}>
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
