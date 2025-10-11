import { Grid, GridItem, Heading, useColorModeValue } from "@chakra-ui/react";
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
  const COLORS = ["#3182CE", "#E53E3E", "#38A169"];

  if (!data) return null;

  // 🎯 Construimos datasets dinámicos
  const pieData = [
    { name: "Cumplimiento", value: data.CUMPLIMIENTO_PCT || 0 },
    { name: "Faltante", value: 100 - (data.CUMPLIMIENTO_PCT || 0) },
  ];

  const barData = [
    { name: "Avance", value: data.AVANCE_MES_USD || 0 },
    { name: "Cuota", value: data.CUOTA_MES_USD || 0 },
    { name: "Pedidos", value: data.PEDIDOS_MES_USD || 0 },
  ];

  const factVsPed = [
    { name: "Facturación vs Pedido", value: data.PCT_FACT_VS_PED || 0 },
  ];

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={6} mb={10}>
      {/* Cumplimiento del mes */}
      <GridItem bg={cardBg} p={4} rounded="2xl" shadow="md">
        <Heading size="sm" mb={3}>
          Cumplimiento del Mes
        </Heading>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              dataKey="value"
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </GridItem>

      {/* Avance vs Cuota */}
      <GridItem bg={cardBg} p={4} rounded="2xl" shadow="md">
        <Heading size="sm" mb={3}>
          Avance vs Cuota
        </Heading>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3182CE" />
          </BarChart>
        </ResponsiveContainer>
      </GridItem>

      {/* Facturación vs Pedido */}
      <GridItem bg={cardBg} p={4} rounded="2xl" shadow="md">
        <Heading size="sm" mb={3}>
          Facturación vs Pedido
        </Heading>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={factVsPed}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#38A169" />
          </BarChart>
        </ResponsiveContainer>
      </GridItem>
    </Grid>
  );
}
