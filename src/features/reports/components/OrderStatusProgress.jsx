import { VStack, Box, Image, Tooltip } from "@chakra-ui/react";

// Paso 1: Pedido creado
// Paso 2: Entrega (varía de color)
// Paso 3: Factura (siempre verde si hay factura)

const stepIcons = [
  { label: "Pedido creado", icon: "/src/assets/icons/order.png" },
  { label: "Entrega", icon: "/src/assets/icons/package.png" },
  { label: "Facturado", icon: "/src/assets/icons/factura.png" },
];

const canceledStates = ["Pedido anulado"];

export default function OrderStatusProgress({ estado }) {
  const getColor = (stepIndex) => {
    if (canceledStates.includes(estado)) return "red";

    // Paso 0 - Pedido creado
    if (stepIndex === 0) return "green";

    // Paso 1 - Entrega
    if (stepIndex === 1) {
      if (estado === "Pedido preparado parcialmente" || estado === "Finalizado con pendientes") {
        return "yellow";
      }
      if (estado === "Pedido preparado" || estado === "Pedido finalizado") {
        return "green";
      }
      return "gray";
    }

    // Paso 2 - Facturado
    if (stepIndex === 2) {
      if (estado === "Pedido finalizado" || estado === "Finalizado con pendientes") {
        return "green";
      }
      return "gray";
    }

    return "gray";
  };

  return (
    <VStack spacing={2}>
      {stepIcons.map((step, index) => {
        const bgColor = getColor(index);

        return (
          <Tooltip label={step.label} key={index} hasArrow>
            <Box
              bg={
                bgColor === "green"
                  ? "green.400"
                  : bgColor === "yellow"
                  ? "yellow.400"
                  : bgColor === "red"
                  ? "red.500"
                  : "gray.300"
              }
              border="2px solid black"
              boxSize="32px"
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Image src={step.icon} alt={step.label} boxSize="20px" />
            </Box>
          </Tooltip>
        );
      })}
    </VStack>
  );
}
