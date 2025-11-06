import {
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Spinner,
  Text,
  Box,
} from "@chakra-ui/react";

export default function SummaryCards({ data, isLoading, error }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "gray.200");

  if (isLoading) {
    return (
      <Box w="100%" textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" thickness="4px" />
        <Text mt={2} color={textColor}>Cargando datos...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box w="100%" textAlign="center" py={8}>
        <Text color="red.500" fontSize="lg">Error al cargar datos</Text>
        <Text color={textColor} fontSize="sm" mt={2}>{error.message}</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box w="100%" textAlign="center" py={8}>
        <Text color="orange.500" fontSize="lg">No hay datos disponibles</Text>
      </Box>
    );
  }

  console.log("la data para ",data);

  // 💾 Extrae valores con fallbacks seguros
  const {
    CANT_PEDIDOS = 0,
    PEDIDOS_MES_USD = 0,
    AVANCE_MES_USD = 0,
    CUMPLIMIENTO_PCT = 0,
    CUOTA_MES_USD = 0,
    VENTAS_HOY_USD = 0,
    DIF_FACT_VS_PED_USD = 0,
    PCT_FACT_VS_PED = 0,
    YEAR = '-',
    MONTH = '-',
    VENDEDOR = '',
  } = data;

  // 📅 Formatear periodo
  const formatPeriodo = () => {
    if (YEAR === 'MULTI' || MONTH === 'MULTI') {
      return 'Consolidado';
    }
    return `${MONTH}/${YEAR}`;
  };

  // 🎨 Función para determinar color según cumplimiento
  const getColorByCumplimiento = (pct) => {
    if (pct >= 100) return "green.500";
    if (pct >= 70) return "yellow.500";
    return "red.500";
  };

  const stats = [
    { 
      label: "Pedidos del Mes", 
      value: CANT_PEDIDOS,
      color: "blue.600"
    },
    {
      label: "Pedidos USD",
      value: Number(PEDIDOS_MES_USD).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      color: "blue.600"
    },
    {
      label: "Avance del Mes",
      value: Number(AVANCE_MES_USD).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      color: "teal.600"
    },
    {
      label: "Cumplimiento",
      value: `${Number(CUMPLIMIENTO_PCT).toFixed(2)}%`,
      color: getColorByCumplimiento(CUMPLIMIENTO_PCT),
      help: CUMPLIMIENTO_PCT >= 100 ? "¡Meta alcanzada!" : "En progreso"
    },
    {
      label: "Cuota USD",
      value: Number(CUOTA_MES_USD).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      color: "purple.600"
    },
    {
      label: "Ventas Hoy",
      value: Number(VENTAS_HOY_USD).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      color: "orange.600"
    },
    {
      label: "Diferencia Fact vs Ped",
      value: Number(DIF_FACT_VS_PED_USD).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      color: DIF_FACT_VS_PED_USD >= 0 ? "green.600" : "red.600",
      help: `${PCT_FACT_VS_PED.toFixed(2)}% facturado`
    },
    { 
      label: "Periodo", 
      value: formatPeriodo(),
      color: "gray.600",
      help: VENDEDOR || undefined
    },
  ];

  return (
    <Box w="100%" px={{ base: 2, md: 4 }} py={2}>
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)", // 📱 móviles
          sm: "repeat(2, 1fr)",   // 📲 pantallas pequeñas
          md: "repeat(3, 1fr)",   // 💻 medianas
          lg: "repeat(4, 1fr)",   // 🖥️ grandes
        }}
        gap={{ base: 3, md: 4, lg: 5 }}
        mb={6}
      >
        {stats.map((stat, index) => (
          <Stat
            key={index}
            p={{ base: 4, md: 5 }}
            bg={cardBg}
            rounded="2xl"
            shadow="md"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            textAlign={{ base: "center", md: "left" }}
            minH="120px"
            transition="all 0.2s"
            _hover={{
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
          >
            <StatLabel 
              fontSize={{ base: "xs", md: "sm" }} 
              color={textColor}
              fontWeight="medium"
              mb={1}
            >
              {stat.label}
            </StatLabel>
            <StatNumber
              fontSize={{ base: "xl", md: "2xl" }}
              fontWeight="bold"
              color={stat.color}
            >
              {stat.value ?? "-"}
            </StatNumber>
            {stat.help && (
              <StatHelpText fontSize="xs" mt={1} mb={0}>
                {stat.help}
              </StatHelpText>
            )}
          </Stat>
        ))}
      </Grid>
    </Box>
  );
}