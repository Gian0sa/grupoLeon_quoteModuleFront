import { Grid, Stat, StatLabel, StatNumber, StatHelpText, useColorModeValue, Spinner, Text } from "@chakra-ui/react";

export default function SummaryCards({ data, isLoading, error }) {
  const cardBg = useColorModeValue("white", "gray.800");

  if (isLoading) return <Spinner size="lg" />;
  if (error) return <Text color="red.500">Error al cargar datos</Text>;
  if (!data) return <Text>No hay datos disponibles</Text>;

  // 💾 Extrae los valores del objeto recibido
  const {
    CANT_PEDIDOS,
    AVANCE_MES_USD,
    CUOTA_MES_USD,
    CUMPLIMIENTO_PCT,
    DIF_FACT_VS_PED_USD,
    PEDIDOS_MES_USD,
    PCT_FACT_VS_PED,
    VENTAS_HOY_USD,
    YEAR,
    MONTH,
  } = data;

  const stats = [
    { label: "Pedidos del Mes", value: CANT_PEDIDOS },
    { label: "Pedidos USD", value: PEDIDOS_MES_USD?.toLocaleString("en-US", { style: "currency", currency: "USD" }) },
    { label: "Avance del Mes", value: AVANCE_MES_USD?.toLocaleString("en-US", { style: "currency", currency: "USD" }) },
    { label: "Cumplimiento", value: `${CUMPLIMIENTO_PCT?.toFixed(2)}%`, color: "green.500" },
    { label: "Cuota USD", value: CUOTA_MES_USD?.toLocaleString("en-US", { style: "currency", currency: "USD" }) },
    { label: "Diferencia Fact vs Ped", value: DIF_FACT_VS_PED_USD?.toLocaleString("en-US", { style: "currency", currency: "USD" }), color: "orange.500" },
    { label: "Facturación vs Pedido", value: `${PCT_FACT_VS_PED?.toFixed(2)}%` },
    { label: "Ventas Hoy", value: VENTAS_HOY_USD?.toLocaleString("en-US", { style: "currency", currency: "USD" }) },
    { label: "Periodo", value: `${MONTH}/${YEAR}` },
  ];

  return (
    <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4} mb={6}>
      {stats.map((stat, index) => (
        <Stat key={index} p={4} bg={cardBg} rounded="2xl" shadow="md">
          <StatLabel>{stat.label}</StatLabel>
          <StatNumber color={stat.color}>{stat.value ?? "-"}</StatNumber>
          {stat.helpText && <StatHelpText>{stat.helpText}</StatHelpText>}
        </Stat>
      ))}
    </Grid>
  );
}
