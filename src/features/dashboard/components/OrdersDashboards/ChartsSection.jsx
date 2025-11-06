import {
  Grid,
  GridItem,
  Heading,
  useColorModeValue,
  Box,
  Text,
} from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ChartsSection({ data }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const COLORS = ["#3182CE", "#CBD5E0"]; // Azul y gris claro

  if (!data) {
    return (
      <Box w="100%" px={{ base: 2, md: 4 }} py={2} textAlign="center">
        <Text color="gray.500">No hay datos disponibles para mostrar gráficos</Text>
      </Box>
    );
  }

  // 🎯 Construcción de datasets dinámicos con valores seguros
  const cumplimiento = Number(data.CUMPLIMIENTO_PCT) || 0;
  const pieData = [
    { name: "Cumplimiento", value: cumplimiento },
    { name: "Faltante", value: Math.max(0, 100 - cumplimiento) },
  ];

  const barData = [
    { name: "Avance", value: Number(data.AVANCE_MES_USD) || 0 },
    { name: "Cuota", value: Number(data.CUOTA_MES_USD) || 0 },
    { name: "Pedidos", value: Number(data.PEDIDOS_MES_USD) || 0 },
  ];

  // 📅 Formatear periodo
  const formatPeriodo = () => {
    if (data.YEAR === 'MULTI' || data.MONTH === 'MULTI') {
      return 'Consolidado';
    }
    return `${data.MONTH}/${data.YEAR}`;
  };

  return (
    <Box w="100%" px={{ base: 2, md: 4 }} py={2}>
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)", // 📱 Móvil
          md: "repeat(2, 1fr)",   // 💻 Mediano
          lg: "repeat(3, 1fr)",   // 🖥️ Grande
        }}
        gap={{ base: 4, md: 6 }}
        mb={10}
      >
        {/* 🎯 Cumplimiento del mes */}
        <GridItem
          bg={cardBg}
          p={{ base: 3, md: 4 }}
          rounded="2xl"
          shadow="md"
          textAlign="center"
        >
          <Heading size="sm" mb={3} color={textColor}>
            Cumplimiento del Mes
          </Heading>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => `${Number(val).toFixed(2)}%`}
                contentStyle={{
                  background: cardBg,
                  borderRadius: "10px",
                  border: "1px solid #ccc",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GridItem>

        {/* 📊 Avance vs Cuota */}
        <GridItem
          bg={cardBg}
          p={{ base: 3, md: 4 }}
          rounded="2xl"
          shadow="md"
          textAlign="center"
        >
          <Heading size="sm" mb={3} color={textColor}>
            Avance vs Cuota
          </Heading>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis
                dataKey="name"
                tick={{ fill: textColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: textColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `$${(value / 1000).toFixed(0)}K`
                }
              />
              <Tooltip
                formatter={(val) =>
                  Number(val).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
                contentStyle={{
                  background: cardBg,
                  borderRadius: "10px",
                  border: "1px solid #ccc",
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3182CE" />
            </BarChart>
          </ResponsiveContainer>
        </GridItem>

        {/* 💵 Pedidos del mes */}
        <GridItem
          bg={cardBg}
          p={{ base: 3, md: 4 }}
          rounded="2xl"
          shadow="md"
          textAlign="center"
        >
          <Heading size="sm" mb={3} color={textColor}>
            Total de Pedidos USD
          </Heading>
          <Box 
            display="flex" 
            flexDir="column" 
            alignItems="center" 
            justifyContent="center" 
            h="220px"
          >
            <Text 
              fontSize={{ base: "2xl", md: "4xl" }} 
              fontWeight="bold" 
              color="blue.500"
              mb={2}
            >
              {Number(data.PEDIDOS_MES_USD || 0).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text fontSize="sm" color={textColor} fontWeight="medium">
              Periodo: {formatPeriodo()}
            </Text>
            {data.CANT_PEDIDOS && (
              <Text fontSize="xs" color={textColor} mt={1}>
                Total: {data.CANT_PEDIDOS} pedidos
              </Text>
            )}
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}