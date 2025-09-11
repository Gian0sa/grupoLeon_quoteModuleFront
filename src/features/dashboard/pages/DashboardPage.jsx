import { 
  Box, 
  Flex, 
  Text, 
  Button, 
  Grid, 
  GridItem, 
  VStack, 
  HStack,
  Icon,
  useColorModeValue,
  IconButton,
  useColorMode,
  Spinner
} from "@chakra-ui/react"; 
import { FiTag } from "react-icons/fi";
import { MoonIcon, SunIcon ,BellIcon } from "@chakra-ui/icons";
import { LateralMenu } from "../components/LateralMenu";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import styles from "./DashboardPage.module.css";  
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { SalesSummary } from "../components/SalesSummary";
import { SalesStats } from "../components/SalesStats";
import { useQuotesSellers } from "../hooks/queries/dashboardQueries";
import { useQuotesSellersAdmin } from "../hooks/queries/dashboardQueries";

export function DashboardPage() { 
  const { salesEmployeeCode, username } = useAuthStore(); 
  
  // Determinar si es vendedor o admin
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const isAdmin = !salesEmployeeCode || salesEmployeeCode === 0;
  
  // Para vendedor usa su código, para admin usa 0
  const querySlpCode = isVendedor ? salesEmployeeCode : 0;

  const defaultMonth = format(subMonths(new Date(), 0), "MM"); 

  // Query para vendedor (solo cuando es vendedor)
  const { data: vendedorData, isLoading: vendedorLoading, error: vendedorError } = useQuotesSellers({
    slpCode: querySlpCode,
    month: defaultMonth
  }, {
    enabled: isVendedor // Solo ejecuta si es vendedor
  });

  // Query para admin (solo cuando es admin)
  const { data: adminData, isLoading: adminLoading, error: adminError } = useQuotesSellersAdmin({
    slpCode: querySlpCode,
    month: defaultMonth
  }, {
    enabled: isAdmin // Solo ejecuta si es admin
  });

  // Determinar qué data usar y estados de loading/error
  const isLoading = isVendedor ? vendedorLoading : adminLoading;
  const error = isVendedor ? vendedorError : adminError;
  
  // Obtener los datos correctos según el tipo de usuario
  const resumenData = isVendedor ? vendedorData?.[0] ?? null : adminData ??  null;

  console.log("Tipo de usuario:", isVendedor ? "Vendedor" : "Admin");
  console.log("Sales Employee Code:", salesEmployeeCode);
  console.log("Query SLP Code:", querySlpCode);
  console.log("Resumen Data:", resumenData);

  const { colorMode, toggleColorMode } = useColorMode();

  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");
  
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  return ( 
    <Box w="100vw" minH="100vh">
      <Box borderRadius="0 0 24px 24px" color="white" position="relative"> 
        <Box className={styles.headerMain}>
          <Flex justify="space-between" align="center" p={4} boxShadow="sm" gap={4}>
            {/* Bloque del saludo */}
            <Box flex="1" minW="0">
              <VStack align="start" spacing={0}>
                <Text fontSize="2xl" fontWeight="bold" whiteSpace="normal">
                  Hola, {username}.
                </Text>
                <Text fontSize="sm" opacity={0.9}>
                  {today.charAt(0).toUpperCase() + today.slice(1)}
                </Text>
                {/* Indicador de tipo de usuario para debug */}
                <Text fontSize="xs" opacity={0.7}>
                  {isVendedor ? `Vendedor (${salesEmployeeCode})` : "Admin"}
                </Text>
              </VStack>
            </Box>

            {/* Bloque de íconos */}
            <HStack spacing={2} flexShrink={0}>
              <IconButton
                aria-label="Toggle Theme"
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
              />
              <IconButton
                icon={<BellIcon />}
                colorScheme="teal"
                variant="ghost"
                aria-label="Notificaciones"
                onClick={() => console.log("Notificaciones")}
              />
              <LateralMenu />
            </HStack>
          </Flex>

          {/* Grupo de botones */}
          <HStack className={styles.btnsgroup}>
            <Button
              bg="whiteAlpha.200"
              color="white"
              size="sm"
              borderRadius="full"
              _hover={{ bg: "whiteAlpha.300" }}
              className={styles.btnactionsdash}
            >
              Nombre botón 1
            </Button>
            <Button
              bg="whiteAlpha.100"
              color="white"
              size="sm"
              borderRadius="full"
              _hover={{ bg: "whiteAlpha.200" }}
              className={styles.btnactionsdash}
            >
              Nombre botón 2
            </Button>
            <Button
              bg="whiteAlpha.100"
              color="white"
              size="sm"
              borderRadius="full"
              _hover={{ bg: "whiteAlpha.200" }}
              className={styles.btnactionsdash}
            >
              Nombre botón 3
            </Button>
          </HStack>
        </Box>

        {/* Cards resumen */}
        <Grid templateColumns="repeat(2, 1fr)" gap={1} p={1} pt={8} className={styles.cards}>
          <GridItem>
            <Box
              bg={cardBg}
              border="1px solid"
              borderRadius="xl"
              h="230px"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              color={textColor}
              p={2}
            >
              {isLoading ? (
                <Spinner color="teal.400" />
              ) : error ? (
                <Text color="red.400">Error al cargar</Text>
              ) : resumenData ? (
                <SalesSummary data={resumenData} />
              ) : (
                <Text>No hay datos disponibles</Text>
              )}
            </Box>
          </GridItem>
          <GridItem>
            <Box
              bg={cardBg}
              border="1px solid"
              borderRadius="xl"
              h="230px"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              color={textColor}
              p={2}
            >
              {isLoading ? (
                <Spinner color="teal.400" />
              ) : error ? (
                <Text color="red.400">Error al cargar</Text>
              ) : resumenData ? (
                <SalesStats data={resumenData} />
              ) : (
                <Text>No hay datos disponibles</Text>
              )}
            </Box>
          </GridItem>
        </Grid>
      </Box>

      {/* Otra sección */}
      <Box p={6}>
        <Text fontSize="xl" fontWeight="bold" mb={4} color={textColor}>
          Insertar título para esta sección
        </Text>

        <VStack spacing={3} align="stretch">
          <Box
            bg={cardBg}
            p={4}
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="green.500"
            shadow="sm"
          >
            <HStack justify="space-between">
              <HStack>
                <Icon as={FiTag} color="green.500" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold">
                    Título para esta sección
                  </Text>
                  <Text fontSize="sm" color={textColor}>
                    Subtítulo para esta sección
                  </Text>
                </VStack>
              </HStack>
              <VStack>
                <Text fontSize="xs">▲</Text>
                <Text fontSize="xs">▼</Text>
              </VStack>
            </HStack>
          </Box>

          <Box
            bg={cardBg}
            p={4}
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="purple.400"
            shadow="sm"
            h="60px"
          />
          <Box
            bg={cardBg}
            p={4}
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="green.400"
            shadow="sm"
            h="60px"
          />
          <Box
            bg={cardBg}
            p={4}
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="yellow.400"
            shadow="sm"
            h="60px"
          />
        </VStack>
      </Box>
    </Box>
  ); 
}