import { Flex, Text, Button, Icon } from "@chakra-ui/react";
import { FiFilter } from "react-icons/fi";

export function ListHeader({ title, showFilters, onToggleFilters }) {
  return (
    <Flex align="center" justify="space-between" mb={6}>
      <Text fontSize="lg" fontWeight="semibold" color="gray.700">
        {title}
      </Text>
      <Button
        variant="ghost"
        rightIcon={<Icon as={FiFilter} />}
        color="gray.500"
        size="sm"
        onClick={onToggleFilters}
      >
        {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
      </Button>
    </Flex>
  );
}