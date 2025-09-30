import React from "react";
import { Box, Button, Input, VStack, Text, HStack, NumberInput, NumberInputField, IconButton } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";

export default function SpecificationsForm({ formData, setFormData }) {
  const addSpecification = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, {
        name: "",
        value: "",
        unit: "",
        order: prev.specifications.length + 1
      }]
    }));
  };

  const updateSpecification = (index, field, value) => {
    const updated = [...formData.specifications];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, specifications: updated }));
  };

  const removeSpecification = (index) => {
    const updated = formData.specifications.filter((_, i) => i !== index);
    // Reordenar los índices
    const reordered = updated.map((spec, i) => ({ ...spec, order: i + 1 }));
    setFormData((prev) => ({ ...prev, specifications: reordered }));
  };

  const moveSpecification = (index, direction) => {
    const updated = [...formData.specifications];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < updated.length) {
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      // Actualizar el orden
      updated[index].order = index + 1;
      updated[newIndex].order = newIndex + 1;
      setFormData((prev) => ({ ...prev, specifications: updated }));
    }
  };

  return (
    <Box>
      <Text fontWeight="bold" fontSize="lg" mb={4}>Especificaciones Técnicas</Text>
      <VStack spacing={4} align="stretch">
        {formData.specifications.map((spec, i) => (
          <Box key={i} p={4} border="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between" mb={3}>
              <Text fontWeight="semibold">Especificación {i + 1}</Text>
              <HStack>
                <Button size="xs" onClick={() => moveSpecification(i, 'up')} disabled={i === 0}>
                  ↑
                </Button>
                <Button size="xs" onClick={() => moveSpecification(i, 'down')} disabled={i === formData.specifications.length - 1}>
                  ↓
                </Button>
                <IconButton
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => removeSpecification(i)}
                />
              </HStack>
            </HStack>
            
            <HStack w="full">
              <Input 
                placeholder="Nombre de la especificación" 
                value={spec.name} 
                onChange={(e) => updateSpecification(i, "name", e.target.value)} 
              />
              <Input 
                placeholder="Valor" 
                value={spec.value} 
                onChange={(e) => updateSpecification(i, "value", e.target.value)} 
              />
              <Input 
                placeholder="Unidad (mm, kg, etc.)" 
                value={spec.unit || ""} 
                onChange={(e) => updateSpecification(i, "unit", e.target.value || null)} 
              />
            </HStack>
          </Box>
        ))}
        
        <Button onClick={addSpecification} colorScheme="purple" variant="outline">
          + Añadir Especificación
        </Button>
      </VStack>
    </Box>
  );
}