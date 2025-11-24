import { FormControl, FormLabel, Badge, Accordion, AccordionItem, AccordionButton, AccordionPanel, Checkbox, Divider, SimpleGrid } from "@chakra-ui/react";
import ServiceCategory from "./ServiceCategory";

export default function PermissionsSection({ 
  groupedServices, 
  permittedServices, 
  onServiceChange,
  onCategoryChange,
  isCategoryFullySelected,
  isCategoryPartiallySelected
}) {
  return (
    <FormControl>
      <FormLabel fontWeight="semibold" fontSize="lg">
        Permisos / Servicios
        <Badge ml={2} colorScheme="blue" fontSize="md">
          {permittedServices.length} seleccionados
        </Badge>
      </FormLabel>
      
      <Accordion allowToggle>
        {Object.entries(groupedServices).map(([categoryKey, category]) => (
          <ServiceCategory
            key={categoryKey}
            category={category}
            categoryKey={categoryKey}
            permittedServices={permittedServices}
            onServiceChange={onServiceChange}
            onCategoryChange={onCategoryChange}
            isCategoryFullySelected={isCategoryFullySelected}
            isCategoryPartiallySelected={isCategoryPartiallySelected}
          />
        ))}
      </Accordion>
    </FormControl>
  );
}