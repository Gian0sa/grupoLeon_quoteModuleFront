import {
  Box,
  Flex,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Circle,
  Stack
} from "@chakra-ui/react";

export default function FiltersWithSummary({
  statuses,
  activeStatus,
  setStatus,
  setStartDate,
  setEndDate,
  startDate,
  endDate,
  summary,
  onFilterApplied,
}) {  

  const handleStatusChange = (statusValue) => {
    if (activeStatus === statusValue) {
      setStatus('');
    } else {
      setStatus(statusValue);
    }
  };

  const handleDateChange = (type, value) => {
    if (type === "start") setStartDate(value);
    else setEndDate(value);
  };

  const handleClearFilters = () => {
    setStatus('');
    setStartDate('');
    setEndDate('');
  };


  const getStatusColor = (statusValue) => {
    const statusObj = statuses.find(s => s.value === statusValue);
    if (statusObj?.color) {
      return statusObj.color;
    }
    // Si no está en el objeto status, busca en summary como fallback
    return summary?.metaPorEstado?.[statusValue]?.color ?? "gray";
  };

  return (
    <Box bg="gray.50" p={6} borderRadius="lg">
      <VStack spacing={6} align="stretch">
        {/* ESTADOS */}
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
              "&::-webkit-scrollbar-thumb": {
                bg: "gray.400",
                borderRadius: "4px",
              },
            }}
          >
            {statuses.slice().reverse().map((statusObj) => {
              const statusValue = statusObj.value;
              const statusLabel = statusObj.label;

              const isActive = activeStatus === statusValue;
              const dynamicColor = getStatusColor(statusValue);

              return (
                <Button
                  key={`${statusValue}-${isActive}`}
                  size="lg"
                  width="100%"
                  justifyContent="space-between"
                  onClick={() => handleStatusChange(statusValue)}
                  px={4}
                  py={2}
                  bg="gray.100"
                  color={isActive ? "green.600" : "gray.700"}
                  border="3px solid"
                  borderColor={isActive ? "green.500" : "gray.200"}
                  borderRadius="full"
                  _hover={{
                    borderColor: "green.500",
                    transform: "translateY(-1px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                  _active={{
                    transform: "translateY(0px)",
                  }}
                  boxShadow={isActive ? "0 2px 8px rgba(0,0,0,0.1)" : "none"}
                  h="60px"
                >
                  <HStack spacing={3} flex={1}>
                    <Circle size="20px" bg={dynamicColor} />
                    <Text
                      fontSize="sm"
                      textAlign="left"
                      flex="1"
                      whiteSpace="normal"
                      fontWeight="normal"
                    >
                      {statusLabel}
                    </Text>
                  </HStack>
                </Button>
              );
            })}
          </Flex>
        </Box> 

        {/* FECHAS */}
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
          <Stack
              direction={{ base: "column", md: "row" }} 
              spacing={4}
              mb={4}
            >
              <Box flex={1}>
                <Text fontSize="sm" mb={2} color="gray.600">
                  Desde
                </Text>
                <Input
                  type="date"
                  size="lg"
                  value={startDate || ""}
                  max={new Date().toISOString().split("T")[0]} 
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
                    borderColor: "gray.300",
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
                  max={new Date().toISOString().split("T")[0]}
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
                    borderColor: "gray.300",
                  }}
                  h="50px"
                />
              </Box>
            </Stack>


          {/* BOTONES */}
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
                bg: "gray.50",
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