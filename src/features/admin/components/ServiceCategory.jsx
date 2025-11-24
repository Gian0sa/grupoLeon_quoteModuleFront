import { AccordionItem, AccordionButton, AccordionPanel, Checkbox, Divider, HStack, SimpleGrid, Text, VStack, Badge, AccordionIcon } from "@chakra-ui/react";
import ServiceItem from "./ServiceItem";


export default function ServiceCategory({ 
  category, 
  categoryKey,
  permittedServices, 
  onServiceChange, 
  onCategoryChange,
  isCategoryFullySelected,
  isCategoryPartiallySelected
}) {
  return (
    <AccordionItem>
      <AccordionButton _hover={{ bg: "gray.50" }}>
        <HStack flex="1" textAlign="left" spacing={3}>
          <Text fontSize="xl">{category.icon}</Text>
          <Text fontWeight="bold">{category.name}</Text>
          <Badge 
            colorScheme={category.color} 
            variant={isCategoryFullySelected(category.services) ? "solid" : "outline"}
          >
            {category.services.length}
          </Badge>
          {isCategoryPartiallySelected(category.services) && (
            <Badge colorScheme="orange" variant="subtle">
              Parcial
            </Badge>
          )}
        </HStack>
        <AccordionIcon />
      </AccordionButton>
      
      <AccordionPanel pb={4} bg="gray.50">
        <VStack align="stretch" spacing={3}>
          <Checkbox
            isChecked={isCategoryFullySelected(category.services)}
            isIndeterminate={isCategoryPartiallySelected(category.services)}
            onChange={(e) => onCategoryChange(category.services, e.target.checked)}
            colorScheme={category.color}
            fontWeight="bold"
            size="lg"
          >
            Seleccionar todos en {category.name}
          </Checkbox>
          
          <Divider />
          
          <SimpleGrid columns={1} spacing={3} pl={6}>
            {category.services.map((srv) => (
              <ServiceItem
                key={srv.id}
                service={srv}
                isChecked={permittedServices.includes(srv.id)}
                onChange={(e) => onServiceChange(srv.id, e.target.checked)}
                colorScheme={category.color}
              />
            ))}
          </SimpleGrid>
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  );
}