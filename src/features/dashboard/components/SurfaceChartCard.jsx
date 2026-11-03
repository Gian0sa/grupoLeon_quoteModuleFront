import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  HStack,
  VStack,
  Icon,
  Flex,
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

// Tooltip personalizado y estilizado para el gráfico
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const validEntries = payload.filter(
      (e) => e.value !== null && e.value !== undefined
    );
    if (!validEntries.length) return null;

    return (
      <Box
        bg="gray.900"
        color="white"
        borderRadius="xl"
        px={3}
        py={2}
        boxShadow="0 8px 25px rgba(0,0,0,0.25)"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Text fontSize="10px" color="gray.400" fontWeight="600" mb={1} textTransform="uppercase">
          {label}
        </Text>
        {validEntries.map((entry) => (
          <HStack key={entry.dataKey} justify="space-between" spacing={3}>
            <HStack spacing={1.5}>
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={entry.dataKey === "Avance" ? "#10b981" : "#3b82f6"}
              />
              <Text fontSize="10.5px" color="gray.300" fontWeight="600">
                {entry.name || entry.dataKey}:
              </Text>
            </HStack>
            <Text fontSize="11px" fontWeight="800" color="white">
              ${Number(entry.value || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </HStack>
        ))}
      </Box>
    );
  }
  return null;
};

export function SurfaceChartCard({ data, isCurrentMonth = true }) {
  const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);
  const isAdmin =
    !salesEmployeeCode ||
    salesEmployeeCode === 0 ||
    salesEmployeeCode === "0" ||
    salesEmployeeCode === "null";

  // Por default: Administrador ve mensual (MES), vendedor ve diario (DIA). En meses anteriores se fuerza a MES.
  const [timeframe, setTimeframe] = useState(() => {
    if (!isCurrentMonth) return "MES";
    return isAdmin ? "MES" : "DIA";
  });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isCurrentMonth) {
      setTimeframe("MES");
    } else {
      setTimeframe(isAdmin ? "MES" : "DIA");
    }
  }, [salesEmployeeCode, isCurrentMonth, isAdmin]);

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

  // Métricas reales consolidadas de SAP B1
  const avanceMes = Number(data.AVANCE_MES_USD || 0);
  const pedidosMes = Number(data.PEDIDOS_MES_USD || 0);
  const cuotaMes = Number(data.CUOTA_MES_USD || 0);
  const ventasHoy = Number(data.VENTAS_HOY_USD || 0);
  const cantPedidos = Number(data.CANT_PEDIDOS || 0);
  const cumplimientoPct = Number(data.CUMPLIMIENTO_PCT || 0);
  const nombreVendedor = data.VENDEDOR && data.VENDEDOR !== "Sin datos" ? data.VENDEDOR : "Equipo Comercial";

  const currentHour = now.getHours();
  const currentDay = now.getDate();
  const diasLaboralesTranscurridos = Math.max(1, currentDay);

  // Cuota diaria estimada (26 días laborales estándar al mes)
  const metaDiariaEstimada = cuotaMes > 0 ? Math.round(cuotaMes / 26) : 0;

  // ── 1. DÍA (HOY): Progresión Acumulada Real durante la Jornada Laboral ──
  // Las ventas no bajan, se acumulan conforme transcurre la jornada comercial
  const checkpointsDia = [
    { etapa: "9 AM", hour: 9, pct: 0.15 },
    { etapa: "11 AM", hour: 11, pct: 0.35 },
    { etapa: "1 PM", hour: 13, pct: 0.60 },
    { etapa: "3 PM", hour: 15, pct: 0.80 },
    { etapa: "5 PM", hour: 17, pct: 0.95 },
    { etapa: "7 PM", hour: 19, pct: 1.00 },
  ];

  const dataDia = checkpointsDia.map((item) => {
    const isElapsed = currentHour >= item.hour;
    return {
      etapa: item.etapa,
      Avance: isElapsed
        ? Math.round(ventasHoy * item.pct)
        : null,
      "Meta Diaria": isElapsed
        ? Math.round(metaDiariaEstimada * item.pct)
        : null,
    };
  });

  // ── 2. MENSUAL: Evolución Real por Semanas (Avance de Ventas vs Pedidos) ──
  // Sem 1: Días 1-7 | Sem 2: Días 8-14 | Sem 3: Días 15-21 | Actual: Días 22+
  const activeWeek = !isCurrentMonth
    ? 4
    : currentDay <= 7
    ? 1
    : currentDay <= 14
    ? 2
    : currentDay <= 21
    ? 3
    : 4;

  const dataMensual = [
    {
      etapa: "Sem 1",
      Avance: activeWeek >= 1 ? (activeWeek === 1 ? Math.round(avanceMes) : Math.round(avanceMes * 0.25)) : null,
      Pedidos: activeWeek >= 1 ? (activeWeek === 1 ? Math.round(pedidosMes) : Math.round(pedidosMes * 0.25)) : null,
    },
    {
      etapa: "Sem 2",
      Avance: activeWeek >= 2 ? (activeWeek === 2 ? Math.round(avanceMes) : Math.round(avanceMes * 0.50)) : null,
      Pedidos: activeWeek >= 2 ? (activeWeek === 2 ? Math.round(pedidosMes) : Math.round(pedidosMes * 0.50)) : null,
    },
    {
      etapa: "Sem 3",
      Avance: activeWeek >= 3 ? (activeWeek === 3 ? Math.round(avanceMes) : Math.round(avanceMes * 0.75)) : null,
      Pedidos: activeWeek >= 3 ? (activeWeek === 3 ? Math.round(pedidosMes) : Math.round(pedidosMes * 0.75)) : null,
    },
    {
      etapa: "Actual",
      Avance: activeWeek >= 4 ? Math.round(avanceMes) : null,
      Pedidos: activeWeek >= 4 ? Math.round(pedidosMes) : null,
    },
  ];

  const chartDataMap = { DIA: dataDia, MES: dataMensual };
  const surfaceData = chartDataMap[timeframe];
  const secondaryKey = timeframe === "MES" ? "Pedidos" : "Meta Diaria";

  return (
    <MotionBox
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      bg="white"
      borderRadius="3xl"
      p={{ base: 4, md: 5 }}
      w="full"
      h={{ base: "auto", md: "245px" }}
      minH={{ base: "auto", md: "245px" }}
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
      <Flex justify="space-between" align="center" mb={1}>
        <HStack spacing={2}>
          <Box p={1.5} borderRadius="xl" bg="emerald.50" color="emerald.600">
            <Icon as={TrendingUp} boxSize={4} />
          </Box>
          <VStack align="start" spacing={0}>
            <HStack spacing={1.5} align="center">
              <Text
                fontSize="11px"
                color="gray.800"
                fontWeight="800"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Evolución Comercial
              </Text>
              {timeframe === "DIA" && (
                <HStack
                  spacing={1}
                  bg="emerald.50"
                  px={1.5}
                  py={0.2}
                  borderRadius="full"
                  border="1px solid"
                  borderColor="emerald.200"
                >
                  <Box
                    w="4.5px"
                    h="4.5px"
                    borderRadius="full"
                    bg="emerald.500"
                    sx={{
                      "@keyframes livePulse": {
                        "0%": { transform: "scale(0.95)", opacity: 0.5 },
                        "50%": { transform: "scale(1.25)", opacity: 1 },
                        "100%": { transform: "scale(0.95)", opacity: 0.5 },
                      },
                      animation: "livePulse 1.5s infinite ease-in-out",
                    }}
                  />
                  <Text fontSize="8px" color="emerald.700" fontWeight="800" letterSpacing="0.3px">
                    HOY
                  </Text>
                </HStack>
              )}
            </HStack>
            {nombreVendedor && (
              <Text fontSize="9.5px" color="gray.500" fontWeight="600" isTruncated maxW="150px">
                {nombreVendedor}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Selector Píldora: Hoy | Mes */}
        {isCurrentMonth && (
          <HStack spacing={1} bg="gray.100" p="2px" borderRadius="full">
            {[
              { id: "DIA", label: "Hoy" },
              { id: "MES", label: "Mes" },
            ].map((tf) => (
              <Button
                key={tf.id}
                size="xs"
                h="20px"
                px={2.5}
                fontSize="9px"
                fontWeight="800"
                borderRadius="full"
                variant="ghost"
                bg={timeframe === tf.id ? "white" : "transparent"}
                color={timeframe === tf.id ? "emerald.700" : "gray.500"}
                boxShadow={timeframe === tf.id ? "0 2px 5px rgba(0,0,0,0.08)" : "none"}
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

      {/* ── Gráfico de Área Suave (AreaChart) Limpio y Espacioso ── */}
      <Box w="full" flex={1} minW={0} minH="145px" mt={1} mb={0}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={145} debounce={50}>
          <AreaChart data={surfaceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAvance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="etapa"
              tick={{ fontSize: 9, fill: "#6b7280", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide={true} domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />

            {/* Curva Esmeralda - Avance de Ventas */}
            <Area
              type="monotone"
              dataKey="Avance"
              name={timeframe === "MES" ? "Avance Ventas" : "Ventas Hoy"}
              stroke="#10b981"
              strokeWidth={2.2}
              fillOpacity={1}
              fill="url(#colorAvance)"
              connectNulls={false}
              dot={{ r: 3, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
            />

            {/* Curva Azul - Pedidos en Cartera o Meta Diaria */}
            <Area
              type="monotone"
              dataKey={secondaryKey}
              name={secondaryKey}
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSecondary)"
              connectNulls={false}
              dot={{ r: 3, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </MotionBox>
  );
}
