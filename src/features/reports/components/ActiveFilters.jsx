import { HStack, Tag, TagLabel, TagCloseButton, Button } from "@chakra-ui/react";

export default function ActiveFilters({
  estadoOrdenFiltro,
  startDate,
  endDate,
  clearSingleEstado,
  clearDateRange,
  clearAll,
}) {
  const activeTags = [];

  if (estadoOrdenFiltro && estadoOrdenFiltro.length > 0) {
    estadoOrdenFiltro.forEach((estado) => {
      activeTags.push({
        label: estado,
        onClear: () => clearSingleEstado(estado),
        style: getEstadoStyle(estado),
      });
    });
  }

  if (startDate || endDate) {
    const format = (date) => date && new Date(date).toLocaleDateString();
    const label = `${format(startDate) ?? "?"} → ${format(endDate) ?? "?"}`;
    activeTags.push({
      label,
      onClear: clearDateRange,
      style: {
        bg: "blue.50",
        color: "blue.700",
        border: "1px solid",
        borderColor: "blue.300",
      },
    });
  }

  if (activeTags.length === 0) return null;

  return (
    <HStack spacing={2} mb={4} flexWrap="wrap">
      {[...activeTags].reverse().map((tag, idx) => (
        <Tag
          key={idx}
          size="md"
          borderRadius="full"
          px={3}
          {...tag.style}
        >
          <TagLabel fontWeight="medium">{tag.label}</TagLabel>
          <TagCloseButton onClick={tag.onClear} />
        </Tag>
      ))}
      <Button
        size="xs"
        variant="ghost"
        colorScheme="red"
        onClick={clearAll}
        fontWeight="medium"
      >
        Limpiar todos
      </Button>
    </HStack>
  );
}

function getEstadoStyle(estado) {
  // 🎯 Mantener el mismo código de colores que tu panel de filtros
  if (estado.includes("anulado")) {
    return {
      bg: "red.50",
      color: "red.600",
      border: "1px solid",
      borderColor: "red.300",
    };
  }
  if (estado.includes("sin preparar")) {
    return {
      bg: "green.50",
      color: "green.700",
      border: "1px solid",
      borderColor: "green.300",
    };
  }
  if (estado.includes("parcial")) {
    return {
      bg: "green.100",
      color: "green.800",
      border: "1px solid",
      borderColor: "green.400",
    };
  }
  if (estado.includes("preparado")) {
    return {
      bg: "green.200",
      color: "green.900",
      border: "1px solid",
      borderColor: "green.500",
    };
  }
  if (estado.includes("finalizado")) {
    return {
      bg: "green.300",
      color: "green.900",
      border: "1px solid",
      borderColor: "green.600",
    };
  }
  return {
    bg: "gray.100",
    color: "gray.700",
    border: "1px solid",
    borderColor: "gray.300",
  };
}
