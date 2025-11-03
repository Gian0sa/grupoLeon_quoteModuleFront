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

  if (!data) return null;

  // 🎯 Construcción de datasets dinámicos
  const pieData = [
    { name: "Cumplimiento", value: data.CUMPLIMIENTO_PCT || 0 },
    { name: "Faltante", value: 100 - (data.CUMPLIMIENTO_PCT || 0) },
  ];

  const barData = [
    { name: "Avance", value: data.AVANCE_MES_USD || 0 },
    { name: "Cuota", value: data.CUOTA_MES_USD || 0 },
    { name: "Pedidos", value: data.PEDIDOS_MES_USD || 0 },
  ];

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
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => `${val.toFixed(2)}%`}
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
                tick={{ fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: textColor }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val) =>
                  val.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
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
          <Box display="flex" flexDir="column" alignItems="center" justifyContent="center" h="full">
            <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="blue.500">
              {data.PEDIDOS_MES_USD?.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              }) ?? "-"}
            </Text>
            <Text fontSize="sm" color={textColor}>
              Periodo: {data.MONTH}/{data.YEAR}
            </Text>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}
