import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  HStack,
  VStack,
  Icon,
  Flex,
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
          {label} • Hoy
        </Text>
        {validEntries.map((entry) => (
          <HStack key={entry.dataKey} justify="space-between" spacing={3}>
            <HStack spacing={1.5}>
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg={entry.dataKey === "Ventas" || entry.dataKey === "Avance" ? "#10b981" : "#3b82f6"}
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

  // Métricas reales consolidadas de SAP B1
  const cuotaMes = Number(data.CUOTA_MES_USD || 0);
  const ventasHoy = Number(data.VENTAS_HOY_USD || 0);
  const nombreVendedor = data.VENDEDOR && data.VENDEDOR !== "Sin datos" ? data.VENDEDOR : "Equipo Comercial";

  // Cuota diaria estimada (26 días laborales estándar al mes)
  const metaDiariaEstimada = cuotaMes > 0 ? Math.round(cuotaMes / 26) : 0;
  const metaRef = metaDiariaEstimada > 0 ? metaDiariaEstimada : 2500;
  const ventasValidas = ventasHoy > 0 ? ventasHoy : 0;

  // ── Curvas de Olas (Waves) fluidas a lo largo de la jornada comercial de HOY ──
  // Perfil de olas con crestas (mañana y tarde) y valle (mediodía/almuerzo)
  const waveCheckpoints = [
    { etapa: "9 AM", waveRatioMeta: 0.22, waveRatioVenta: 0.18 },
    { etapa: "11 AM", waveRatioMeta: 0.58, waveRatioVenta: 0.52 },
    { etapa: "1 PM", waveRatioMeta: 0.72, waveRatioVenta: 0.70 },
    { etapa: "3 PM", waveRatioMeta: 0.62, waveRatioVenta: 0.58 }, // Valle suave de la ola
    { etapa: "5 PM", waveRatioMeta: 0.92, waveRatioVenta: 0.88 }, // Segunda cresta vespertina
    { etapa: "7 PM", waveRatioMeta: 1.00, waveRatioVenta: 1.00 }, // Cierre de jornada
  ];

  // Si aún no hay ventas registradas hoy, se proyecta una suave ola base proporcional
  const waveVentasBase = ventasValidas > 0 ? ventasValidas : Math.round(metaRef * 0.12);

  const waveData = waveCheckpoints.map((pt) => ({
    etapa: pt.etapa,
    Meta: Math.round(metaRef * pt.waveRatioMeta),
    Ventas: Math.round(waveVentasBase * pt.waveRatioVenta),
  }));

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
      {/* ── Header fijo en HOY con badge live y métricas rápidas ── */}
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
            </HStack>
            {nombreVendedor && (
              <Text fontSize="9.5px" color="gray.500" fontWeight="600" isTruncated maxW="150px">
                {nombreVendedor}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Leyenda y Montos en Vivo de Hoy (en lugar de selector de píldoras) */}
        <HStack spacing={2.5} align="center">
          <HStack spacing={1}>
            <Box w="6px" h="6px" borderRadius="full" bg="#10b981" />
            <Text fontSize="9.5px" fontWeight="700" color="gray.600">
              Hoy: {fmt(ventasValidas)}
            </Text>
          </HStack>
          {metaDiariaEstimada > 0 && (
            <HStack spacing={1}>
              <Box w="6px" h="6px" borderRadius="full" bg="#3b82f6" />
              <Text fontSize="9.5px" fontWeight="700" color="gray.400">
                Meta: {fmt(metaDiariaEstimada)}
              </Text>
            </HStack>
          )}
        </HStack>
      </Flex>

      {/* ── Gráfico de Olas Fluidas (AreaChart Natural) sin líneas rígidas ni puntos ── */}
      <Box w="full" flex={1} minW={0} minH="145px" mt={1} mb={0}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={145} debounce={50}>
          <AreaChart data={waveData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
            <defs>
              {/* Gradiente Ola Verde Esmeralda (Ventas Hoy) */}
              <linearGradient id="waveVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.50} />
                <stop offset="50%" stopColor="#10b981" stopOpacity={0.20} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradiente Ola Azul Zafiro (Meta Diaria) */}
              <linearGradient id="waveMeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="etapa"
              tick={{ fontSize: 9, fill: "#94a3b8", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide={true} domain={[0, 'auto']} />
            <Tooltip content={<CustomTooltip />} />

            {/* Ola de Fondo: Meta Diaria (Curva Natural de Agua) */}
            <Area
              type="natural"
              dataKey="Meta"
              name="Meta Diaria"
              stroke="#3b82f6"
              strokeWidth={1.8}
              strokeOpacity={0.7}
              fillOpacity={1}
              fill="url(#waveMeta)"
              dot={false}
              activeDot={{ r: 4.5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
            />

            {/* Ola Frontal: Ventas Hoy (Curva Natural de Agua con Volumen) */}
            <Area
              type="natural"
              dataKey="Ventas"
              name="Ventas Hoy"
              stroke="#10b981"
              strokeWidth={2.2}
              strokeOpacity={0.9}
              fillOpacity={1}
              fill="url(#waveVentas)"
              dot={false}
              activeDot={{ r: 4.5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </MotionBox>
  );
}
