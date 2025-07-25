import { HStack, Tag, TagLabel, TagCloseButton, Button } from "@chakra-ui/react";

export default function ActiveFilters({
  estadoOrdenFiltro,
  startDate,
  endDate,
  clearSingleEstado, // 👈 nuevo prop
  clearDateRange,
  clearAll,
}) {
  const activeTags = [];

  // Mostrar cada estado como un tag individual
  if (estadoOrdenFiltro && estadoOrdenFiltro.length > 0) {
    estadoOrdenFiltro.forEach((estado) => {
      activeTags.push({
        label: `Estado: ${estado}`,
        onClear: () => clearSingleEstado(estado),
      });
    });
  }

  if (startDate || endDate) {
    const format = (date) => date && new Date(date).toLocaleDateString();
    const label = `Fecha: ${format(startDate) ?? "?"} - ${format(endDate) ?? "?"}`;
    activeTags.push({
      label,
      onClear: clearDateRange,
    });
  }

  if (activeTags.length === 0) return null;

  return (
    <HStack spacing={2} mb={4} flexWrap="wrap">
     {[...activeTags].reverse().map((tag, idx) => (
        <Tag size="md" key={idx} variant="subtle" colorScheme="white">
          <TagLabel>{tag.label}</TagLabel>
          <TagCloseButton onClick={tag.onClear} />
        </Tag>
      ))}
      <Button size="sm" variant="ghost" colorScheme="red" onClick={clearAll}>
        Limpiar todos
      </Button>
    </HStack>
  );
}
