import { Box, Flex, Button, Input, Image, Text, VStack, HStack, Circle } from "@chakra-ui/react";

export default function FiltersWithSummary({
  statuses,
  activeStatuses,
  setStatuses,
  setStartDate,
  setEndDate,
  startDate,
  endDate,
  summary,
  onFilterApplied,
}) {
  const statusIcons = {
    "Pedido sin preparar": "/src/assets/icons/order.png",
    "Pedido preparado parcialmente": "/src/assets/icons/package.png",
    "Pedido preparado": "/src/assets/icons/package.png",
    "Pedido finalizado": "/src/assets/icons/factura.png",
    "Finalizado con pendientes": "/src/assets/icons/factura.png",
    "Pedido anulado": "/src/assets/icons/portapapeles.png",
  };

  // Colores para los círculos según el estado
  const statusColors = {
    "Pedido sin preparar": "gray.500",
    "Pedido preparado parcialmente": "gray.500", 
    "Pedido preparado": "gray.500",
    "Pedido finalizado": "gray.500",
    "Finalizado con pendientes": "gray.500",
    "Pedido anulado": "gray.500",
  };

  const yellowStatuses = ["Pedido preparado parcialmente", "Finalizado con pendientes"];
  const redStatuses = ["Pedido anulado"];

  const handleStatusChange = (status) => {
    const newActiveStatuses = activeStatuses.includes(status)
      ? activeStatuses.filter((s) => s !== status)
      : [...activeStatuses, status];
    setStatuses(newActiveStatuses);
  };

  const handleDateChange = (type, value) => {
    if (type === "start") setStartDate(value);
    else setEndDate(value);
  };

  const handleClearFilters = () => {
    setStatuses([]);
    setStartDate("");
    setEndDate("");
  };

  return (
    <Box bg="gray.50" p={6} borderRadius="lg">
      <VStack spacing={6} align="stretch">
        {/* Estados */}
        <Box>
          <Text 
            fontSize="sm" 
            fontWeight="semibold" 
            mb={4} 
            color="green.600"
            textTransform="uppercase"
          >
            ESTADOS
          </Text>
          <Flex
            direction="column"
            gap={3}
            pr={2}
            sx={{
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": { bg: "gray.400", borderRadius: "4px" },
            }}
          >
            {statuses.map((status) => {
              const count = summary?.porEstado?.[status] || 0;
              if (count === 0) return null;

              const isActive = activeStatuses.includes(status);

              return (
                <Button
                  key={`${status}-${isActive}`}
                  size="lg"
                  width="100%"
                  justifyContent="space-between"
                  onClick={() => handleStatusChange(status)}
                  px={4}
                  py={2}
                  bg={isActive ? "gray.100" : "gray.100"}
                  color={isActive ? "green.500" : "gray.700"}
                  border="2px solid"
                  borderColor={isActive ? "green.500" : "gray.200"}
                  borderRadius="full"
                  _hover={{
                    borderColor: "green.500",
                    transform: "translateY(-1px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  _active={{
                    transform: "translateY(0px)"
                  }}
                  boxShadow={isActive ? "0 2px 8px rgba(0,0,0,0.1)" : "none"}
                  h="60px"
                >
                  <HStack spacing={3} flex={1}>
                    <Circle size="20px" bg={isActive ? "green.500" : statusColors[status]} />
                    <Text 
                      fontSize="sm" 
                      textAlign="left" 
                      flex="1" 
                      whiteSpace="normal"
                      fontWeight="normal"
                    >
                      {status}
                    </Text>
                  </HStack>
                  <Box
                    bg={isActive ? "green.500" : statusColors[status]}
                    color={isActive ? "white" : "white"}
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="sm"
                    fontWeight="bold"
                    minW="50px"
                    textAlign="center"
                  >
                    {count}
                  </Box>
                </Button>
              );
            })}
          </Flex>
        </Box>

        {/* Filtro por Fecha */}
        <Box>
          <Text 
            fontSize="sm" 
            fontWeight="semibold" 
            mb={4} 
            color="green.600"
            textTransform="uppercase"
          >
            FECHAS
          </Text>
          <HStack spacing={4} mb={4}>
            <Box flex={1}>
              <Text fontSize="sm" mb={2} color="gray.600">
                Desde
              </Text>
              <Input
                type="date"
                size="lg"
                value={startDate || ""}
                onChange={(e) => handleDateChange("start", e.target.value)}
                bg="white"
                border="2px solid"
                borderColor="gray.200"
                borderRadius="full"
                _focus={{
                  borderColor: "green.500",
                  boxShadow: "0 0 0 1px green.500",
                }}
                _hover={{
                  borderColor: "gray.300"
                }}
                h="50px"
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="sm" mb={2} color="gray.600">
                Hasta
              </Text>
              <Input
                type="date"
                size="lg"
                value={endDate || ""}
                onChange={(e) => handleDateChange("end", e.target.value)}
                bg="white"
                border="2px solid"
                borderColor="gray.200"
                borderRadius="full"
                _focus={{
                  borderColor: "green.500",
                  boxShadow: "0 0 0 1px green.500",
                }}
                _hover={{
                  borderColor: "gray.300"
                }}
                h="50px"
              />
            </Box>
          </HStack>

          {/* Botones */}
          <VStack spacing={3}>
            <Button 
              colorScheme="green" 
              size="lg"
              width="100%"
              borderRadius="full"
              onClick={onFilterApplied}
              h="50px"
              fontSize="md"
              fontWeight="normal"
            >
              Aplicar Filtros
            </Button>

            <Button 
              variant="outline" 
              colorScheme="gray" 
              size="lg"
              width="100%"
              borderRadius="full"
              onClick={handleClearFilters}
              h="50px"
              fontSize="md"
              fontWeight="normal"
              border="2px solid"
              borderColor="gray.300"
              _hover={{
                borderColor: "gray.400",
                bg: "gray.50"
              }}
            >
              Limpiar Filtros
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}