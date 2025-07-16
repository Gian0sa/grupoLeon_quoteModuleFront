import { Box, Flex, Button, Input, Image } from "@chakra-ui/react";

export default function FiltersWithSummary({
  statuses,
  activeStatus,
  setStatus,
  setStartDate,
  setEndDate,
  startDate,
  endDate,
  summary,
}) {
  const statusIcons = {
    "Pedido sin preparar": "/src/assets/icons/order.png",
    "Pedido preparado parcialmente": "/src/assets/icons/package.png",
    "Pedido preparado": "/src/assets/icons/package.png",
    "Pedido finalizado": "/src/assets/icons/factura.png",
    "Finalizado con pendientes": "/src/assets/icons/factura.png",
    "Pedido anulado": "/src/assets/icons/portapapeles.png",
  };

  const yellowStatuses = ["Pedido preparado parcialmente", "Finalizado con pendientes"];
  const redStatuses = ["Pedido anulado"];

  return (
    <>
      {/* Botones de estado con scroll horizontal */}
      <Flex
        wrap="nowrap"
        overflowX="auto"
        gap={2}
        mb={3}
        pb={2}
        sx={{
          "&::-webkit-scrollbar": { height: "6px" },
          "&::-webkit-scrollbar-thumb": { bg: "gray.400", borderRadius: "4px" },
        }}
      >
        {statuses.map((status) => {
          const count = summary?.porEstado?.[status] || 0;
          if (count === 0) return null; // Ocultar si no hay elementos

          const isActive = activeStatus === status;
          const isYellow = yellowStatuses.includes(status);
          const isRed = redStatuses.includes(status);

          const bg = isRed
            ? isActive
              ? "red.400"
              : "red.200"
            : isYellow
            ? isActive
              ? "yellow.400"
              : "yellow.200"
            : isActive
            ? "blue.500"
            : "gray.100";

          const color = isRed
            ? "white"
            : isYellow
            ? isActive
              ? "black"
              : "gray.700"
            : isActive
            ? "white"
            : "gray.800";

          return (
            <Button
              key={status}
              size="sm"
              minW="fit-content"
              onClick={() => setStatus(isActive ? null : status)}
              px={2}
              py={1}
              bg={bg}
              color={color}
              _hover={{ bg: isYellow ? "yellow.300" : isRed ? "red.300" : "blue.600" }}
              _active={{ bg: isYellow ? "yellow.500" : isRed ? "red.500" : "blue.700" }}
            >
              <Flex align="center" gap={1}>
                <Image src={statusIcons[status]} alt={status} boxSize="18px" />
                <Box
                  bg="whiteAlpha.800"
                  color="black"
                  px={2}
                  py="1px"
                  borderRadius="full"
                  fontSize="10px"
                  fontWeight="bold"
                  minW="16px"
                  textAlign="center"
                >
                  {count}
                </Box>
              </Flex>
            </Button>
          );
        })}
      </Flex>

      {/* Filtros por fecha */}
      <Flex gap={4} mb={2} wrap="wrap" align="center">
        <Box>
          <Box fontSize="sm" mb={1}>From</Box>
          <Input
            type="date"
            size="sm"
            value={startDate || ""}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Box>
        <Box>
          <Box fontSize="sm" mb={1}>To</Box>
          <Input
            type="date"
            size="sm"
            value={endDate || ""}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Box>
      </Flex>
    </>
  );
}
